import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcartsService } from './rapprochement/ecarts.service';
import { RapprochementComptableService } from './rapprochement/rapprochement-comptable.service';
import { LettrageAutomatiqueService } from './rapprochement/lettrage-automatique.service';

export interface IndicateursBanque {
  soldeBancaire: number;
  soldeComptable: number;
  ecart: number;
  transactionsNonRapprochees: number;
  transactionsRapprochees: number;
  recettes: number; // Total crédits sur la période
  depenses: number; // Total débits sur la période
}

@Injectable()
export class BanqueService {
  constructor(
    private prisma: PrismaService,
    private ecartsService: EcartsService,
    private rapprochementService: RapprochementComptableService,
    private lettrageService: LettrageAutomatiqueService,
  ) {}

  /**
   * Récupère les transactions d'un compte bancaire avec filtres
   */
  async getTransactions(
    societeId: string,
    compteBancaireId: string,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      rapproche?: boolean;
      type?: 'DEBIT' | 'CREDIT';
      categorie?: string;
      search?: string; // Recherche dans le libellé
    },
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    const where: any = { compteBancaireId };
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = filters.dateFrom;
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        where.date.lte = dateTo;
      }
    }
    if (filters?.rapproche !== undefined) where.rapproche = filters.rapproche;
    if (filters?.type) where.type = filters.type;
    if (filters?.categorie) where.categorie = filters.categorie;
    if (filters?.search) {
      where.libelle = { contains: filters.search, mode: 'insensitive' };
    }

    const transactions = await this.prisma.transactionBancaire.findMany({
      where,
      include: {
        compteBancaire: true,
        rapprochementsComptables: {
          where: { statut: { in: ['PENDING', 'VALIDATED'] } },
          include: {
            ecritureComptable: {
              include: {
                compteDebit: true,
                compteCredit: true,
              },
            },
            compteComptable: true,
          },
        },
        rapprochementsFacture: {
          where: { statut: { in: ['PENDING', 'VALIDATED'] } },
          include: { facture: { include: { client: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    return transactions;
  }

  /**
   * Calcule les indicateurs pour un compte bancaire
   */
  async getIndicateurs(
    societeId: string,
    compteBancaireId: string,
    date?: Date,
  ): Promise<IndicateursBanque> {
    const dateVerification = date || new Date();

    const soldeBancaire = await this.ecartsService.calculerSoldeBancaire(
      compteBancaireId,
      dateVerification,
    );

    const soldeComptable = await this.ecartsService.calculerSoldeComptable(
      societeId,
      compteBancaireId,
      dateVerification,
    );

    const ecart = soldeComptable - soldeBancaire;

    // Compter les transactions non rapprochées
    const transactionsNonRapprochees =
      await this.prisma.transactionBancaire.count({
        where: {
          compteBancaireId,
          rapproche: false,
          date: { lte: dateVerification },
        },
      });

    const transactionsRapprochees =
      await this.prisma.transactionBancaire.count({
        where: {
          compteBancaireId,
          rapproche: true,
          date: { lte: dateVerification },
        },
      });

    // Calculer recettes et dépenses sur la période
    const dateFrom = new Date(dateVerification);
    dateFrom.setMonth(dateFrom.getMonth() - 1); // Dernier mois

    const transactions = await this.prisma.transactionBancaire.findMany({
      where: {
        compteBancaireId,
        date: {
          gte: dateFrom,
          lte: dateVerification,
        },
      },
    });

    let recettes = 0;
    let depenses = 0;

    for (const transaction of transactions) {
      const montant = Number(transaction.montant);
      if (transaction.type === 'CREDIT') {
        recettes += montant;
      } else {
        depenses += montant;
      }
    }

    return {
      soldeBancaire,
      soldeComptable,
      ecart,
      transactionsNonRapprochees,
      transactionsRapprochees,
      recettes,
      depenses,
    };
  }

  /**
   * Applique le lettrage automatique sur toutes les transactions non rapprochées
   */
  async appliquerLettrageAutomatique(
    societeId: string,
    compteBancaireId: string,
  ): Promise<{ rapproches: number; erreurs: string[] }> {
    const transactions = await this.prisma.transactionBancaire.findMany({
      where: {
        compteBancaireId,
        compteBancaire: { societeId },
        rapproche: false,
      },
    });

    let rapproches = 0;
    const erreurs: string[] = [];

    for (const transaction of transactions) {
      try {
        // 1. Essayer les règles de lettrage
        const resultatRegles =
          await this.lettrageService.appliquerReglesLettrage(
            societeId,
            transaction.id,
          );

        if (resultatRegles) {
          rapproches++;
          continue;
        }

        // 2. Essayer le lettrage par montant exact
        const resultatMontant =
          await this.lettrageService.lettrageParMontant(
            societeId,
            transaction.id,
          );

        if (resultatMontant) {
          rapproches++;
          continue;
        }

        // 3. Essayer le lettrage par correspondance intelligente
        const ecrituresPotentielles =
          await this.rapprochementService.trouverEcrituresPotentielles(
            societeId,
            transaction.id,
          );

        if (ecrituresPotentielles.length > 0 && ecrituresPotentielles[0].score >= 70) {
          await this.rapprochementService.creerRapprochement(
            societeId,
            transaction.id,
            ecrituresPotentielles[0].ecriture.id,
            undefined,
            ecrituresPotentielles[0].score,
            'Lettrage automatique par correspondance',
          );
          rapproches++;
        }
      } catch (error: any) {
        erreurs.push(
          `Transaction ${transaction.id}: ${error.message || 'Erreur inconnue'}`,
        );
      }
    }

    return { rapproches, erreurs };
  }

  /**
   * Détecte et crée les écarts de rapprochement
   */
  async detecterEtCreerEcarts(
    societeId: string,
    compteBancaireId: string,
    date?: Date,
  ) {
    const ecarts = await this.ecartsService.detecterEcarts(
      societeId,
      compteBancaireId,
      date,
    );

    // Créer les écarts en base de données
    const ecartsCrees: any[] = [];
    for (const ecart of ecarts) {
      // Vérifier si l'écart existe déjà
      const existing = await this.prisma.ecartRapprochement.findFirst({
        where: {
          societeId,
          compteBancaireId,
          date: ecart.date,
          typeEcart: ecart.typeEcart,
          resolu: false,
        },
      });

      if (!existing && ecart.id.startsWith('ecart_')) {
        // Créer seulement les écarts généraux (pas les doublons/mouvements manquants qui sont temporaires)
        const ecartCree = await this.prisma.ecartRapprochement.create({
          data: {
            societeId,
            compteBancaireId,
            date: ecart.date,
            soldeComptable: ecart.soldeComptable,
            soldeBancaire: ecart.soldeBancaire,
            ecart: ecart.ecart,
            typeEcart: ecart.typeEcart,
            description: ecart.description,
            resolu: false,
          },
        });
        ecartsCrees.push(ecartCree);
      }
    }

    return ecartsCrees;
  }
}
