import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EcartRapprochementDto {
  id: string;
  societeId: string;
  compteBancaireId: string;
  date: Date;
  soldeComptable: number;
  soldeBancaire: number;
  ecart: number;
  typeEcart: string;
  description?: string;
  resolu: boolean;
}

@Injectable()
export class EcartsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcule le solde bancaire à une date donnée
   */
  async calculerSoldeBancaire(
    compteBancaireId: string,
    date?: Date,
  ): Promise<number> {
    const compte = await this.prisma.compteBancaire.findUnique({
      where: { id: compteBancaireId },
    });

    if (!compte) {
      return 0;
    }

    let solde = Number(compte.soldeInitial || 0);

    const where: any = { compteBancaireId };
    if (date) {
      where.date = { lte: date };
    }

    const transactions = await this.prisma.transactionBancaire.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    for (const transaction of transactions) {
      const montant = Number(transaction.montant);
      if (transaction.type === 'CREDIT') {
        solde += montant;
      } else {
        solde -= montant;
      }
    }

    return solde;
  }

  /**
   * Calcule le solde comptable (compte 512) pour un compte bancaire
   */
  async calculerSoldeComptable(
    societeId: string,
    compteBancaireId: string,
    date?: Date,
  ): Promise<number> {
    const compte = await this.prisma.compteBancaire.findUnique({
      where: { id: compteBancaireId },
    });

    if (!compte) {
      return 0;
    }

    // Trouver le compte 512 (Banque)
    const compteBanque = await this.prisma.compteComptable.findFirst({
      where: { code: '512' },
    });

    if (!compteBanque) {
      return 0;
    }

    const where: any = {
      societeId,
      OR: [
        { compteDebitId: compteBanque.id },
        { compteCreditId: compteBanque.id },
      ],
    };

    if (date) {
      where.date = { lte: date };
    }

    const ecritures = await this.prisma.ecritureComptable.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    let solde = 0;
    for (const ecriture of ecritures) {
      const montant = Number(ecriture.montant);
      if (ecriture.compteDebitId === compteBanque.id) {
        solde += montant; // Débit = augmentation du solde bancaire
      } else {
        solde -= montant; // Crédit = diminution du solde bancaire
      }
    }

    return solde;
  }

  /**
   * Détecte les écarts entre solde comptable et solde bancaire
   */
  async detecterEcarts(
    societeId: string,
    compteBancaireId: string,
    date?: Date,
  ): Promise<EcartRapprochementDto[]> {
    const dateVerification = date || new Date();
    const soldeBancaire = await this.calculerSoldeBancaire(
      compteBancaireId,
      dateVerification,
    );
    const soldeComptable = await this.calculerSoldeComptable(
      societeId,
      compteBancaireId,
      dateVerification,
    );

    const ecart = soldeComptable - soldeBancaire;
    const ecarts: EcartRapprochementDto[] = [];

    // Si écart significatif (> 1 FCFA), analyser les causes
    if (Math.abs(ecart) > 1) {
      // 1. Détecter les doublons
      const doublons = await this.detecterDoublons(
        societeId,
        compteBancaireId,
        dateVerification,
      );
      ecarts.push(...doublons);

      // 2. Détecter les mouvements manquants
      const mouvementsManquants = await this.detecterMouvementsManquants(
        societeId,
        compteBancaireId,
        dateVerification,
      );
      ecarts.push(...mouvementsManquants);

      // 3. Détecter les ODs (opérations diverses) sur compte 512
      const ods = await this.detecterODs(societeId, compteBancaireId, dateVerification);
      ecarts.push(...ods);

      // 4. Écart général si aucune cause spécifique trouvée
      if (ecarts.length === 0) {
        ecarts.push({
          id: 'ecart_general',
          societeId,
          compteBancaireId,
          date: dateVerification,
          soldeComptable,
          soldeBancaire,
          ecart,
          typeEcart: 'AUTRE',
          description: `Écart de ${Math.abs(ecart).toLocaleString('fr-FR')} FCFA entre solde comptable et bancaire`,
          resolu: false,
        });
      }
    }

    return ecarts;
  }

  /**
   * Détecte les transactions en doublon
   */
  private async detecterDoublons(
    societeId: string,
    compteBancaireId: string,
    date: Date,
  ): Promise<EcartRapprochementDto[]> {
    const transactions = await this.prisma.transactionBancaire.findMany({
      where: {
        compteBancaireId,
        date: { lte: date },
      },
      orderBy: { date: 'asc' },
    });

    const doublons: EcartRapprochementDto[] = [];
    const groupes = new Map<string, any[]>();

    // Grouper par date + montant + libellé
    for (const transaction of transactions) {
      const cle = `${transaction.date.toISOString().split('T')[0]}_${transaction.montant}_${transaction.libelle.substring(0, 50)}`;
      if (!groupes.has(cle)) {
        groupes.set(cle, []);
      }
      groupes.get(cle)!.push(transaction);
    }

    // Identifier les doublons
    for (const [cle, groupe] of groupes) {
      if (groupe.length > 1) {
        const montantTotal = groupe.reduce(
          (sum, t) => sum + Number(t.montant),
          0,
        );
        doublons.push({
          id: `doublon_${groupe[0].id}`,
          societeId,
          compteBancaireId,
          date: groupe[0].date,
          soldeComptable: 0,
          soldeBancaire: montantTotal,
          ecart: montantTotal,
          typeEcart: 'DOUBLON',
          description: `${groupe.length} transactions identiques détectées (${groupe[0].libelle.substring(0, 50)})`,
          resolu: false,
        });
      }
    }

    return doublons;
  }

  /**
   * Détecte les mouvements manquants (en comptabilité ou en banque)
   */
  private async detecterMouvementsManquants(
    societeId: string,
    compteBancaireId: string,
    date: Date,
  ): Promise<EcartRapprochementDto[]> {
    const compte = await this.prisma.compteBancaire.findUnique({
      where: { id: compteBancaireId },
    });

    if (!compte) {
      return [];
    }

    const compteBanque = await this.prisma.compteComptable.findFirst({
      where: { code: '512' },
    });

    if (!compteBanque) {
      return [];
    }

    // Récupérer toutes les transactions bancaires
    const transactions = await this.prisma.transactionBancaire.findMany({
      where: {
        compteBancaireId,
        date: { lte: date },
        rapproche: false, // Non rapprochées
      },
    });

    // Récupérer toutes les écritures sur compte 512
    const ecritures = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        date: { lte: date },
        OR: [
          { compteDebitId: compteBanque.id },
          { compteCreditId: compteBanque.id },
        ],
        rapprochementsComptables: {
          none: {
            statut: { in: ['PENDING', 'VALIDATED'] },
          },
        },
      },
    });

    const mouvementsManquants: EcartRapprochementDto[] = [];

    // Transactions sans écriture correspondante
    for (const transaction of transactions) {
      const montant = Number(transaction.montant);
      const correspondance = ecritures.find(
        (e) =>
          Math.abs(Number(e.montant) - montant) < 0.01 &&
          Math.abs(
            (e.date.getTime() - transaction.date.getTime()) /
              (1000 * 60 * 60 * 24),
          ) <= 7,
      );

      if (!correspondance) {
        mouvementsManquants.push({
          id: `manquant_${transaction.id}`,
          societeId,
          compteBancaireId,
          date: transaction.date,
          soldeComptable: 0,
          soldeBancaire: montant,
          ecart: montant,
          typeEcart: 'MOUVEMENT_MANQUANT',
          description: `Transaction bancaire sans écriture comptable correspondante: ${transaction.libelle}`,
          resolu: false,
        });
      }
    }

    return mouvementsManquants;
  }

  /**
   * Détecte les ODs (opérations diverses) sur compte 512
   */
  private async detecterODs(
    societeId: string,
    compteBancaireId: string,
    date: Date,
  ): Promise<EcartRapprochementDto[]> {
    const compteBanque = await this.prisma.compteComptable.findFirst({
      where: { code: '512' },
    });

    if (!compteBanque) {
      return [];
    }

    // Écritures sur compte 512 qui ne sont pas des transactions bancaires normales
    const ecritures = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        date: { lte: date },
        OR: [
          { compteDebitId: compteBanque.id },
          { compteCreditId: compteBanque.id },
        ],
        rapprochementsComptables: {
          none: {
            statut: { in: ['PENDING', 'VALIDATED'] },
          },
        },
      },
    });

    const ods: EcartRapprochementDto[] = [];

    for (const ecriture of ecritures) {
      // Vérifier si c'est une OD (compte contrepartie non standard)
      const compteContrepartie =
        ecriture.compteDebitId === compteBanque.id
          ? ecriture.compteCreditId
          : ecriture.compteDebitId;

      const compte = await this.prisma.compteComptable.findUnique({
        where: { id: compteContrepartie },
      });

      // ODs typiques : comptes 67x (charges exceptionnelles), 77x (produits exceptionnels), etc.
      if (compte && (compte.code.startsWith('67') || compte.code.startsWith('77'))) {
        ods.push({
          id: `od_${ecriture.id}`,
          societeId,
          compteBancaireId,
          date: ecriture.date,
          soldeComptable: Number(ecriture.montant),
          soldeBancaire: 0,
          ecart: Number(ecriture.montant),
          typeEcart: 'OD_512',
          description: `OD sur compte 512: ${ecriture.libelle} (compte ${compte.code})`,
          resolu: false,
        });
      }
    }

    return ods;
  }

  /**
   * Marque un écart comme résolu
   */
  async resoudreEcart(ecartId: string): Promise<void> {
    await this.prisma.ecartRapprochement.update({
      where: { id: ecartId },
      data: { resolu: true },
    });
  }

  /**
   * Liste les écarts non résolus
   */
  async getEcartsNonResolus(
    societeId: string,
    compteBancaireId?: string,
  ): Promise<EcartRapprochementDto[]> {
    const where: any = {
      societeId,
      resolu: false,
    };

    if (compteBancaireId) {
      where.compteBancaireId = compteBancaireId;
    }

    const ecarts = await this.prisma.ecartRapprochement.findMany({
      where,
      include: {
        compteBancaire: true,
      },
      orderBy: { date: 'desc' },
    });

    return ecarts.map(this.mapToDto);
  }

  private mapToDto(e: any): EcartRapprochementDto {
    return {
      id: e.id,
      societeId: e.societeId,
      compteBancaireId: e.compteBancaireId,
      date: e.date,
      soldeComptable: Number(e.soldeComptable),
      soldeBancaire: Number(e.soldeBancaire),
      ecart: Number(e.ecart),
      typeEcart: e.typeEcart,
      description: e.description,
      resolu: e.resolu,
    };
  }
}
