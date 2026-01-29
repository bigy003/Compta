import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MatchingResult {
  transactionId: string;
  factureId: string;
  paiementId?: string;
  score: number;
  raison: string;
}

@Injectable()
export class RapprochementAvanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Trouve les correspondances automatiques entre transactions bancaires et factures
   */
  async trouverCorrespondancesAutomatiques(
    societeId: string,
    compteBancaireId?: string,
  ): Promise<MatchingResult[]> {
    // Récupérer toutes les transactions CREDIT (entrées d'argent)
    const whereTransaction: any = {
      type: 'CREDIT',
      compteBancaire: { societeId },
    };
    if (compteBancaireId) {
      whereTransaction.compteBancaireId = compteBancaireId;
    }

    // Récupérer toutes les transactions CREDIT
    const allTransactions = await this.prisma.transactionBancaire.findMany({
      where: whereTransaction,
      include: {
        compteBancaire: true,
      },
      orderBy: { date: 'desc' },
    });

    // Récupérer tous les rapprochements de factures en cours pour cette société
    const rapprochementsEnCours = await this.prisma.rapprochementFacture.findMany({
      where: {
        societeId,
        transactionBancaireId: { not: null },
        statut: { in: ['PENDING', 'VALIDATED'] },
      },
      select: {
        transactionBancaireId: true,
        factureId: true,
      },
    });

    // Créer un Set des combinaisons transaction+facture déjà rapprochées
    const combinaisonsRapprochees = new Set(
      rapprochementsEnCours
        .filter((r) => r.transactionBancaireId !== null)
        .map((r) => `${r.transactionBancaireId}-${r.factureId}`),
    );

    // Filtrer les transactions qui n'ont pas déjà un rapprochement de facture en cours
    const transactions = allTransactions.filter(
      (t) => {
        // Vérifier si cette transaction a un rapprochement en cours
        const hasRapprochement = rapprochementsEnCours.some(
          (r) => r.transactionBancaireId === t.id,
        );
        return !hasRapprochement;
      },
    );

    // Récupérer les factures non payées ou partiellement payées
    const factures = await this.prisma.facture.findMany({
      where: {
        societeId,
        statut: { in: ['ENVOYEE', 'PAYEE'] },
      },
      include: {
        client: true,
        paiements: true,
      },
    });

    const correspondances: MatchingResult[] = [];

    for (const transaction of transactions) {
      // Ne traiter que les crédits (entrées d'argent)
      if (transaction.type !== 'CREDIT') continue;

      const montantTransaction = Number(transaction.montant);

      for (const facture of factures) {
        const totalFacture = Number(facture.totalTTC);
        const totalPaye = facture.paiements.reduce(
          (sum, p) => sum + Number(p.montant),
          0,
        );
        const resteAPayer = totalFacture - totalPaye;

        // Si la facture est déjà entièrement payée, passer à la suivante
        if (resteAPayer <= 0) continue;

        let score = 0;
        const raisons: string[] = [];

        // 1. Correspondance exacte du montant (score: 50)
        if (Math.abs(montantTransaction - resteAPayer) < 0.01) {
          score += 50;
          raisons.push('Montant exact');
        } else if (
          Math.abs(montantTransaction - resteAPayer) / resteAPayer < 0.05
        ) {
          // Différence de moins de 5%
          score += 30;
          raisons.push('Montant proche (±5%)');
        } else if (
          Math.abs(montantTransaction - resteAPayer) / resteAPayer < 0.1
        ) {
          // Différence de moins de 10%
          score += 15;
          raisons.push('Montant proche (±10%)');
        }

        // 2. Correspondance de la date (score: 30)
        const diffJours =
          Math.abs(
            transaction.date.getTime() - facture.date.getTime(),
          ) /
          (1000 * 60 * 60 * 24);
        if (diffJours <= 3) {
          score += 30;
          raisons.push(`Date proche (${Math.round(diffJours)} jours)`);
        } else if (diffJours <= 7) {
          score += 15;
          raisons.push(`Date proche (${Math.round(diffJours)} jours)`);
        } else if (diffJours <= 30) {
          score += 5;
          raisons.push(`Date dans le mois`);
        }

        // 3. Correspondance du libellé avec le numéro de facture (score: 20)
        const numeroFactureNormalise = facture.numero
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        const libelleNormalise = transaction.libelle
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        if (libelleNormalise.includes(numeroFactureNormalise)) {
          score += 20;
          raisons.push('Numéro de facture dans le libellé');
        }

        // 4. Correspondance du libellé avec le nom du client (score: 10)
        const nomClientNormalise = facture.client.nom
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        if (
          nomClientNormalise.length > 3 &&
          libelleNormalise.includes(nomClientNormalise)
        ) {
          score += 10;
          raisons.push('Nom du client dans le libellé');
        }

        // 5. Correspondance avec référence de paiement (score: 15)
        for (const paiement of facture.paiements) {
          if (paiement.reference) {
            const refNormalise = paiement.reference
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
            if (libelleNormalise.includes(refNormalise)) {
              score += 15;
              raisons.push('Référence de paiement trouvée');
              break;
            }
          }
        }

        // Vérifier que cette combinaison transaction+facture n'est pas déjà rapprochée
        const combinaisonKey = `${transaction.id}-${facture.id}`;
        if (combinaisonsRapprochees.has(combinaisonKey)) {
          continue; // Passer à la facture suivante
        }

        // Si le score est suffisant (>= 40), ajouter la correspondance
        if (score >= 40) {
          correspondances.push({
            transactionId: transaction.id,
            factureId: facture.id,
            score,
            raison: raisons.join(', '),
          });
        }
      }
    }

    // Trier par score décroissant
    return correspondances.sort((a, b) => b.score - a.score);
  }

  /**
   * Crée un rapprochement automatique
   */
  async creerRapprochementAutomatique(
    societeId: string,
    transactionId: string,
    factureId: string,
    paiementId?: string,
  ) {
    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: { id: transactionId },
      include: { compteBancaire: true },
    });

    if (!transaction || transaction.compteBancaire.societeId !== societeId) {
      throw new NotFoundException('Transaction introuvable');
    }

    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
      include: { paiements: true },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    // Vérifier que la transaction n'a pas déjà un rapprochement de facture en cours
    // Vérifier aussi qu'elle n'a pas déjà un rapprochement avec cette même facture
    const existingRapprochement = await this.prisma.rapprochementFacture.findFirst({
      where: {
        transactionBancaireId: transactionId,
        factureId: factureId,
        statut: { in: ['PENDING', 'VALIDATED'] },
      },
    });

    if (existingRapprochement) {
      throw new Error(
        'Cette transaction a déjà un rapprochement de facture en cours pour cette facture',
      );
    }

    // Calculer le montant du rapprochement
    const montantTransaction = Number(transaction.montant);
    const totalPaye = facture.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    const resteAPayer = Number(facture.totalTTC) - totalPaye;
    const montantRapproche = Math.min(montantTransaction, resteAPayer);

    // Créer le rapprochement
    const rapprochement = await this.prisma.rapprochementFacture.create({
      data: {
        societeId,
        factureId,
        paiementId: paiementId || null,
        transactionBancaireId: transactionId,
        montant: montantRapproche,
        statut: 'PENDING',
        scoreConfiance: null, // Sera calculé lors de la création automatique
      },
      include: {
        facture: {
          include: { client: true },
        },
        transactionBancaire: {
          include: { compteBancaire: true },
        },
        paiement: true,
      },
    });

    return rapprochement;
  }

  /**
   * Valide un rapprochement
   */
  async validerRapprochement(
    societeId: string,
    rapprochementId: string,
  ) {
    const rapprochement = await this.prisma.rapprochementFacture.findFirst({
      where: { id: rapprochementId, societeId },
      include: {
        transactionBancaire: true,
        facture: { include: { paiements: true } },
      },
    });

    if (!rapprochement) {
      throw new NotFoundException('Rapprochement introuvable');
    }

    if (rapprochement.statut === 'VALIDATED') {
      throw new Error('Ce rapprochement est déjà validé');
    }

    // Mettre à jour le statut du rapprochement
    await this.prisma.rapprochementFacture.update({
      where: { id: rapprochementId },
      data: { statut: 'VALIDATED' },
    });

    // Marquer la transaction comme rapprochée (si elle ne l'est pas déjà)
    // Note: Une transaction peut être rapprochée avec une recette/dépense ET une facture
    if (
      rapprochement.transactionBancaire &&
      !rapprochement.transactionBancaire.rapproche
    ) {
      await this.prisma.transactionBancaire.update({
        where: { id: rapprochement.transactionBancaireId! },
        data: { rapproche: true },
      });
    }

    // Vérifier si la facture est maintenant entièrement payée
    const totalPaye = rapprochement.facture.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    const totalRapproche = await this.prisma.rapprochementFacture.aggregate({
      where: {
        factureId: rapprochement.factureId,
        statut: 'VALIDATED',
      },
      _sum: { montant: true },
    });

    const totalPayeAvecRapprochement =
      totalPaye + Number(totalRapproche._sum.montant || 0);

    if (totalPayeAvecRapprochement >= Number(rapprochement.facture.totalTTC)) {
      await this.prisma.facture.update({
        where: { id: rapprochement.factureId },
        data: { statut: 'PAYEE' },
      });
    }

    return this.prisma.rapprochementFacture.findUnique({
      where: { id: rapprochementId },
      include: {
        facture: { include: { client: true } },
        transactionBancaire: { include: { compteBancaire: true } },
        paiement: true,
      },
    });
  }

  /**
   * Rejette un rapprochement
   */
  async rejeterRapprochement(societeId: string, rapprochementId: string) {
    const rapprochement = await this.prisma.rapprochementFacture.findFirst({
      where: { id: rapprochementId, societeId },
    });

    if (!rapprochement) {
      throw new NotFoundException('Rapprochement introuvable');
    }

    return this.prisma.rapprochementFacture.update({
      where: { id: rapprochementId },
      data: { statut: 'REJECTED' },
    });
  }

  /**
   * Liste les rapprochements en attente de validation
   */
  async listRapprochementsEnAttente(societeId: string) {
    return this.prisma.rapprochementFacture.findMany({
      where: {
        societeId,
        statut: 'PENDING',
      },
      include: {
        facture: {
          include: {
            client: true,
            paiements: true,
          },
        },
        transactionBancaire: {
          include: {
            compteBancaire: true,
          },
        },
        paiement: true,
      },
      orderBy: { dateRapprochement: 'desc' },
    });
  }

  /**
   * Liste tous les rapprochements
   */
  async listRapprochements(
    societeId: string,
    filters?: {
      statut?: string;
      factureId?: string;
    },
  ) {
    const where: any = { societeId };
    if (filters?.statut) {
      where.statut = filters.statut;
    }
    if (filters?.factureId) {
      where.factureId = filters.factureId;
    }

    return this.prisma.rapprochementFacture.findMany({
      where,
      include: {
        facture: {
          include: {
            client: true,
            paiements: true,
          },
        },
        transactionBancaire: {
          include: {
            compteBancaire: true,
          },
        },
        paiement: true,
      },
      orderBy: { dateRapprochement: 'desc' },
    });
  }
}
