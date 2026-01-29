import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateEcritureDto {
  compteDebitId: string;
  compteCreditId: string;
  date: string;
  montant: number;
  libelle: string;
  pieceJustificative?: string;
  journal?: string;
}

@Injectable()
export class PlanComptableService {
  constructor(private readonly prisma: PrismaService) {}

  // Initialiser le plan comptable SYSCOHADA de base
  async initializePlanComptable() {
    const count = await this.prisma.compteComptable.count();
    if (count > 0) {
      return { message: 'Plan comptable déjà initialisé' };
    }

    const comptes = [
      // Classe 1 - Financement permanent
      { code: '10', libelle: 'Capital', classe: 1, type: 'PASSIF', collectif: true },
      { code: '11', libelle: 'Réserves', classe: 1, type: 'PASSIF', collectif: true },
      { code: '12', libelle: 'Report à nouveau', classe: 1, type: 'PASSIF', collectif: true },
      { code: '13', libelle: 'Résultat net', classe: 1, type: 'PASSIF', collectif: true },
      { code: '15', libelle: 'Emprunts et dettes assimilées', classe: 1, type: 'PASSIF', collectif: true },
      
      // Classe 2 - Actif immobilisé
      { code: '20', libelle: 'Immobilisations incorporelles', classe: 2, type: 'ACTIF', collectif: true },
      { code: '21', libelle: 'Immobilisations corporelles', classe: 2, type: 'ACTIF', collectif: true },
      { code: '22', libelle: 'Immobilisations financières', classe: 2, type: 'ACTIF', collectif: true },
      
      // Classe 3 - Stocks
      { code: '30', libelle: 'Matières premières', classe: 3, type: 'ACTIF', collectif: true },
      { code: '31', libelle: 'Produits en cours', classe: 3, type: 'ACTIF', collectif: true },
      { code: '37', libelle: 'Stocks de marchandises', classe: 3, type: 'ACTIF', collectif: true },
      
      // Classe 4 - Tiers
      { code: '40', libelle: 'Fournisseurs', classe: 4, type: 'PASSIF', collectif: true },
      { code: '411', libelle: 'Clients', classe: 4, type: 'ACTIF', collectif: false },
      { code: '42', libelle: 'Personnel', classe: 4, type: 'PASSIF', collectif: true },
      { code: '43', libelle: 'Sécurité sociale et autres organismes sociaux', classe: 4, type: 'PASSIF', collectif: true },
      { code: '44', libelle: 'État et autres collectivités publiques', classe: 4, type: 'PASSIF', collectif: true },
      { code: '445', libelle: 'TVA à payer', classe: 4, type: 'PASSIF', collectif: false },
      { code: '4451', libelle: 'TVA collectée', classe: 4, type: 'PASSIF', collectif: false },
      { code: '4452', libelle: 'TVA déductible', classe: 4, type: 'ACTIF', collectif: false },
      { code: '45', libelle: 'Groupe et associés', classe: 4, type: 'PASSIF', collectif: true },
      
      // Classe 5 - Trésorerie
      { code: '51', libelle: 'Banques', classe: 5, type: 'ACTIF', collectif: true },
      { code: '53', libelle: 'Caisse', classe: 5, type: 'ACTIF', collectif: true },
      { code: '57', libelle: 'Valeurs mobilières de placement', classe: 5, type: 'ACTIF', collectif: true },
      
      // Classe 6 - Charges
      { code: '60', libelle: 'Achats', classe: 6, type: 'CHARGE', collectif: true },
      { code: '601', libelle: 'Achats stockés - Matières premières', classe: 6, type: 'CHARGE', collectif: false },
      { code: '607', libelle: 'Achats stockés - Marchandises', classe: 6, type: 'CHARGE', collectif: false },
      { code: '61', libelle: 'Services extérieurs', classe: 6, type: 'CHARGE', collectif: true },
      { code: '62', libelle: 'Autres services extérieurs', classe: 6, type: 'CHARGE', collectif: true },
      { code: '63', libelle: 'Impôts, taxes et versements assimilés', classe: 6, type: 'CHARGE', collectif: true },
      { code: '64', libelle: 'Charges de personnel', classe: 6, type: 'CHARGE', collectif: true },
      { code: '65', libelle: 'Autres charges de gestion courante', classe: 6, type: 'CHARGE', collectif: true },
      { code: '66', libelle: 'Charges financières', classe: 6, type: 'CHARGE', collectif: true },
      { code: '67', libelle: 'Charges exceptionnelles', classe: 6, type: 'CHARGE', collectif: true },
      { code: '68', libelle: 'Dotations aux amortissements et provisions', classe: 6, type: 'CHARGE', collectif: true },
      
      // Classe 7 - Produits
      { code: '70', libelle: 'Ventes', classe: 7, type: 'PRODUIT', collectif: true },
      { code: '701', libelle: 'Ventes de produits finis', classe: 7, type: 'PRODUIT', collectif: false },
      { code: '707', libelle: 'Ventes de marchandises', classe: 7, type: 'PRODUIT', collectif: false },
      { code: '71', libelle: 'Production stockée', classe: 7, type: 'PRODUIT', collectif: true },
      { code: '74', libelle: 'Subventions d\'exploitation', classe: 7, type: 'PRODUIT', collectif: true },
      { code: '75', libelle: 'Autres produits de gestion courante', classe: 7, type: 'PRODUIT', collectif: true },
      { code: '76', libelle: 'Produits financiers', classe: 7, type: 'PRODUIT', collectif: true },
      { code: '77', libelle: 'Produits exceptionnels', classe: 7, type: 'PRODUIT', collectif: true },
      
      // Classe 8 - Résultats
      { code: '80', libelle: 'Résultat d\'exploitation', classe: 8, type: 'PASSIF', collectif: true },
      { code: '81', libelle: 'Résultat financier', classe: 8, type: 'PASSIF', collectif: true },
      { code: '82', libelle: 'Résultat exceptionnel', classe: 8, type: 'PASSIF', collectif: true },
      { code: '83', libelle: 'Résultat net de l\'exercice', classe: 8, type: 'PASSIF', collectif: true },
    ];

    for (const compte of comptes) {
      await this.prisma.compteComptable.create({
        data: compte,
      });
    }

    return { message: 'Plan comptable SYSCOHADA initialisé', count: comptes.length };
  }

  // Lister tous les comptes
  listComptes(classe?: number, search?: string) {
    const where: any = {};
    if (classe) {
      where.classe = classe;
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { libelle: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.compteComptable.findMany({
      where,
      include: {
        parent: true,
        enfants: true,
      },
      orderBy: [
        { classe: 'asc' },
        { code: 'asc' },
      ],
    });
  }

  // Obtenir un compte par code
  getCompteByCode(code: string) {
    return this.prisma.compteComptable.findUnique({
      where: { code },
      include: {
        parent: true,
        enfants: true,
      },
    });
  }

  // Écritures comptables
  listEcritures(societeId: string, from?: string, to?: string, exerciceId?: string) {
    const where: any = { societeId };

    if (exerciceId) {
      where.exerciceId = exerciceId;
    }

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    return this.prisma.ecritureComptable.findMany({
      where,
      include: {
        compteDebit: true,
        compteCredit: true,
        exercice: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  // Trouver l'exercice correspondant à une date
  private async findExerciceByDate(societeId: string, date: Date) {
    const exercice = await this.prisma.exercice.findFirst({
      where: {
        societeId,
        dateDebut: { lte: date },
        dateFin: { gte: date },
      },
    });
    return exercice;
  }

  async createEcriture(societeId: string, dto: CreateEcritureDto) {
    // Vérifier que les comptes existent
    const compteDebit = await this.prisma.compteComptable.findUnique({
      where: { id: dto.compteDebitId },
    });
    const compteCredit = await this.prisma.compteComptable.findUnique({
      where: { id: dto.compteCreditId },
    });

    if (!compteDebit || !compteCredit) {
      throw new Error('Compte comptable introuvable');
    }

    // Trouver l'exercice correspondant à la date
    const dateEcriture = new Date(dto.date);
    const exercice = await this.findExerciceByDate(societeId, dateEcriture);

    return this.prisma.ecritureComptable.create({
      data: {
        societeId,
        exerciceId: exercice?.id,
        compteDebitId: dto.compteDebitId,
        compteCreditId: dto.compteCreditId,
        date: dateEcriture,
        montant: dto.montant,
        libelle: dto.libelle,
        pieceJustificative: dto.pieceJustificative,
        journal: dto.journal,
      },
      include: {
        compteDebit: true,
        compteCredit: true,
        exercice: true,
      },
    });
  }

  // Grand livre - solde d'un compte pour une société
  async getSoldeCompte(societeId: string, compteId: string, from?: string, to?: string) {
    const where: any = {
      societeId,
      OR: [
        { compteDebitId: compteId },
        { compteCreditId: compteId },
      ],
    };

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const ecritures = await this.prisma.ecritureComptable.findMany({
      where,
    });

    const compte = await this.prisma.compteComptable.findUnique({
      where: { id: compteId },
    });

    if (!compte) {
      throw new Error('Compte introuvable');
    }

    let debit = 0;
    let credit = 0;

    for (const ecriture of ecritures) {
      if (ecriture.compteDebitId === compteId) {
        debit += Number(ecriture.montant);
      }
      if (ecriture.compteCreditId === compteId) {
        credit += Number(ecriture.montant);
      }
    }

    // Calcul du solde selon le type de compte
    let solde = 0;
    if (compte.type === 'ACTIF' || compte.type === 'CHARGE') {
      solde = debit - credit;
    } else {
      solde = credit - debit;
    }

    return {
      compte,
      debit,
      credit,
      solde,
      nombreEcritures: ecritures.length,
    };
  }

  // Générer écriture comptable depuis une facture
  async generateEcritureFromFacture(
    societeId: string,
    factureId: string,
    factureNumero: string,
    factureDate: Date,
    totalHT: number,
    totalTVA: number,
    totalTTC: number,
  ) {
    // Trouver les comptes nécessaires
    const compteClient = await this.prisma.compteComptable.findUnique({
      where: { code: '411' },
    });
    const compteVente = await this.prisma.compteComptable.findUnique({
      where: { code: '707' },
    });
    const compteTVA = await this.prisma.compteComptable.findUnique({
      where: { code: '4451' },
    });

    if (!compteClient || !compteVente || !compteTVA) {
      throw new Error('Comptes comptables manquants. Veuillez initialiser le plan comptable.');
    }

    // Trouver l'exercice correspondant à la date de la facture
    const exercice = await this.findExerciceByDate(societeId, factureDate);

    // Écriture 1: Débit Clients (411) / Crédit Ventes (707) pour le HT
    await this.prisma.ecritureComptable.create({
      data: {
        societeId,
        exerciceId: exercice?.id,
        compteDebitId: compteClient.id,
        compteCreditId: compteVente.id,
        date: factureDate,
        montant: totalHT,
        libelle: `Facture ${factureNumero} - Vente HT`,
        pieceJustificative: factureId,
        journal: 'Ventes',
      },
    });

    // Écriture 2: Débit Clients (411) / Crédit TVA collectée (4451) pour la TVA
    if (totalTVA > 0) {
      await this.prisma.ecritureComptable.create({
        data: {
          societeId,
          exerciceId: exercice?.id,
          compteDebitId: compteClient.id,
          compteCreditId: compteTVA.id,
          date: factureDate,
          montant: totalTVA,
          libelle: `Facture ${factureNumero} - TVA collectée`,
          pieceJustificative: factureId,
          journal: 'Ventes',
        },
      });
    }

    return { message: 'Écritures comptables générées' };
  }

  // Générer écriture comptable depuis une recette
  async generateEcritureFromRecette(
    societeId: string,
    recetteId: string,
    recetteDate: Date,
    montant: number,
    description?: string,
  ) {
    // Trouver les comptes nécessaires
    const compteBanque = await this.prisma.compteComptable.findUnique({
      where: { code: '512' },
    });
    const compteProduits = await this.prisma.compteComptable.findUnique({
      where: { code: '706' },
    });

    if (!compteBanque || !compteProduits) {
      throw new Error('Comptes comptables manquants. Veuillez initialiser le plan comptable.');
    }

    // Trouver l'exercice correspondant à la date de la recette
    const exercice = await this.findExerciceByDate(societeId, recetteDate);

    await this.prisma.ecritureComptable.create({
      data: {
        societeId,
        exerciceId: exercice?.id,
        compteDebitId: compteBanque.id,
        compteCreditId: compteProduits.id,
        date: recetteDate,
        montant,
        libelle: description || `Recette ${recetteId}`,
        pieceJustificative: recetteId,
        journal: 'Recettes',
      },
    });

    return { message: 'Écriture comptable générée' };
  }

  // Générer écriture comptable depuis une dépense
  async generateEcritureFromDepense(
    societeId: string,
    depenseId: string,
    depenseDate: Date,
    montant: number,
    description?: string,
  ) {
    // Trouver les comptes nécessaires
    const compteBanque = await this.prisma.compteComptable.findUnique({
      where: { code: '512' },
    });
    const compteCharges = await this.prisma.compteComptable.findUnique({
      where: { code: '606' },
    });

    if (!compteBanque || !compteCharges) {
      throw new Error('Comptes comptables manquants. Veuillez initialiser le plan comptable.');
    }

    // Trouver l'exercice correspondant à la date de la dépense
    const exercice = await this.findExerciceByDate(societeId, depenseDate);

    await this.prisma.ecritureComptable.create({
      data: {
        societeId,
        exerciceId: exercice?.id,
        compteDebitId: compteCharges.id,
        compteCreditId: compteBanque.id,
        date: depenseDate,
        montant,
        libelle: description || `Dépense ${depenseId}`,
        pieceJustificative: depenseId,
        journal: 'Achats',
      },
    });

    return { message: 'Écriture comptable générée' };
  }
}
