import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RapprochementComptableService } from './rapprochement-comptable.service';

@Injectable()
export class LettrageAutomatiqueService {
  constructor(
    private prisma: PrismaService,
    private rapprochementService: RapprochementComptableService,
  ) {}

  /**
   * Applique toutes les règles de lettrage actives pour une transaction
   */
  async appliquerReglesLettrage(
    societeId: string,
    transactionBancaireId: string,
  ): Promise<{ rapprochement: any; regleAppliquee: any } | null> {
    // Récupérer les règles actives triées par priorité
    const regles = await this.prisma.regleLettrage.findMany({
      where: {
        societeId,
        active: true,
      },
      orderBy: { priorite: 'asc' },
    });

    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: {
        id: transactionBancaireId,
        compteBancaire: { societeId },
      },
    });

    if (!transaction) {
      return null;
    }

    // Essayer chaque règle dans l'ordre
    for (const regle of regles) {
      const criteres = regle.criteres as any;
      const action = regle.action as any;

      // Vérifier si la transaction correspond aux critères
      if (this.transactionCorrespondCriteres(transaction, criteres)) {
        // Appliquer l'action de la règle
        const rapprochement = await this.appliquerAction(
          societeId,
          transactionBancaireId,
          action,
        );

        if (rapprochement) {
          return { rapprochement, regleAppliquee: regle };
        }
      }
    }

    return null;
  }

  /**
   * Vérifie si une transaction correspond aux critères d'une règle
   */
  private transactionCorrespondCriteres(
    transaction: any,
    criteres: {
      libelleContient?: string;
      montantMin?: number;
      montantMax?: number;
      type?: string;
      categorie?: string;
    },
  ): boolean {
    const montant = Number(transaction.montant);

    // Vérifier le montant
    if (criteres.montantMin !== undefined && montant < criteres.montantMin) {
      return false;
    }
    if (criteres.montantMax !== undefined && montant > criteres.montantMax) {
      return false;
    }

    // Vérifier le type
    if (criteres.type && transaction.type !== criteres.type) {
      return false;
    }

    // Vérifier la catégorie
    if (criteres.categorie && transaction.categorie !== criteres.categorie) {
      return false;
    }

    // Vérifier le libellé
    if (criteres.libelleContient) {
      const libelle = transaction.libelle.toLowerCase();
      const motsCles = criteres.libelleContient
        .toLowerCase()
        .split(',')
        .map((m: string) => m.trim());
      const correspond = motsCles.some((mot: string) => libelle.includes(mot));
      if (!correspond) {
        return false;
      }
    }

    return true;
  }

  /**
   * Applique l'action d'une règle de lettrage
   */
  private async appliquerAction(
    societeId: string,
    transactionBancaireId: string,
    action: {
      compteComptable?: string;
      typeEcriture?: string;
      compteContrepartie?: string;
    },
  ): Promise<any | null> {
    // Si la règle spécifie un compte comptable, créer un rapprochement direct
    if (action.compteComptable) {
      const compte = await this.prisma.compteComptable.findFirst({
        where: {
          code: action.compteComptable,
        },
      });

      if (compte) {
        try {
          const rapprochement = await this.rapprochementService.creerRapprochement(
            societeId,
            transactionBancaireId,
            undefined, // Pas d'écriture spécifique
            compte.id,
            80, // Score de confiance élevé pour règles automatiques
            'Lettrage automatique par règle',
          );
          return rapprochement;
        } catch (error) {
          // Ignorer les erreurs (déjà rapproché, etc.)
          return null;
        }
      }
    }

    // Si typeEcriture = AUTO, chercher une écriture correspondante
    if (action.typeEcriture === 'AUTO') {
      const ecrituresPotentielles =
        await this.rapprochementService.trouverEcrituresPotentielles(
          societeId,
          transactionBancaireId,
        );

      if (ecrituresPotentielles.length > 0) {
        const meilleure = ecrituresPotentielles[0];
        if (meilleure.score >= 70) {
          // Seuil de confiance élevé
          try {
            const rapprochement =
              await this.rapprochementService.creerRapprochement(
                societeId,
                transactionBancaireId,
                meilleure.ecriture.id,
                undefined,
                meilleure.score,
                'Lettrage automatique par correspondance',
              );
            return rapprochement;
          } catch (error) {
            return null;
          }
        }
      }
    }

    return null;
  }

  /**
   * Lettrage par montant exact
   */
  async lettrageParMontant(
    societeId: string,
    transactionBancaireId: string,
  ): Promise<any | null> {
    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: {
        id: transactionBancaireId,
        compteBancaire: { societeId },
      },
    });

    if (!transaction) {
      return null;
    }

    const montant = Number(transaction.montant);
    const compteBanque = await this.prisma.compteComptable.findFirst({
      where: { code: '512' },
    });

    if (!compteBanque) {
      return null;
    }

    // Chercher une écriture avec le même montant sur le compte 512
    const ecriture = await this.prisma.ecritureComptable.findFirst({
      where: {
        societeId,
        montant: montant,
        OR: [
          { compteDebitId: compteBanque.id },
          { compteCreditId: compteBanque.id },
        ],
        // Pas déjà rapprochée
        rapprochementsComptables: {
          none: {
            statut: { in: ['PENDING', 'VALIDATED'] },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    if (ecriture) {
      try {
        return await this.rapprochementService.creerRapprochement(
          societeId,
          transactionBancaireId,
          ecriture.id,
          undefined,
          90, // Score très élevé pour montant exact
          'Lettrage automatique par montant exact',
        );
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  /**
   * Lettrage par libellé (mots-clés)
   */
  async lettrageParLibelle(
    societeId: string,
    transactionBancaireId: string,
    motsCles: string[],
  ): Promise<any | null> {
    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: {
        id: transactionBancaireId,
        compteBancaire: { societeId },
      },
    });

    if (!transaction) {
      return null;
    }

    const compteBanque = await this.prisma.compteComptable.findFirst({
      where: { code: '512' },
    });

    if (!compteBanque) {
      return null;
    }

    // Chercher une écriture avec des mots-clés similaires dans le libellé
    const libelleTransaction = transaction.libelle.toLowerCase();
    const conditions = motsCles.map((mot) => ({
      libelle: {
        contains: mot,
        mode: 'insensitive' as const,
      },
    }));

    const ecritures = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        OR: [
          { compteDebitId: compteBanque.id },
          { compteCreditId: compteBanque.id },
          ...conditions,
        ],
        // Pas déjà rapprochée
        rapprochementsComptables: {
          none: {
            statut: { in: ['PENDING', 'VALIDATED'] },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    // Trouver la meilleure correspondance
    for (const ecriture of ecritures) {
      const libelleEcriture = ecriture.libelle.toLowerCase();
      const motsCommuns = motsCles.filter((mot) =>
        libelleEcriture.includes(mot.toLowerCase()),
      );

      if (motsCommuns.length >= motsCles.length * 0.5) {
        // Au moins 50% des mots-clés correspondent
        try {
          return await this.rapprochementService.creerRapprochement(
            societeId,
            transactionBancaireId,
            ecriture.id,
            undefined,
            70, // Score moyen pour correspondance par libellé
            `Lettrage automatique par libellé (${motsCommuns.length}/${motsCles.length} mots)`,
          );
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }
}
