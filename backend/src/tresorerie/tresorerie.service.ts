import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanComptableService } from '../plan-comptable/plan-comptable.service';

interface MouvementDto {
  date: string;
  montant: number;
  description?: string;
}

@Injectable()
export class TresorerieService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PlanComptableService))
    private readonly planComptableService: PlanComptableService,
  ) {}

  listRecettes(societeId: string, from?: string, to?: string) {
    const where: any = { societeId };
    
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

    return this.prisma.recette.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  listDepenses(societeId: string, from?: string, to?: string) {
    const where: any = { societeId };
    
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

    return this.prisma.depense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async createRecette(societeId: string, dto: MouvementDto) {
    const recette = await this.prisma.recette.create({
      data: {
        societeId,
        date: new Date(dto.date),
        montant: dto.montant,
        description: dto.description,
      },
    });

    // Générer l'écriture comptable automatiquement
    try {
      await this.planComptableService.generateEcritureFromRecette(
        societeId,
        recette.id,
        recette.date,
        Number(recette.montant),
        recette.description || undefined,
      );
    } catch (error) {
      // Ne pas bloquer la création de la recette si l'écriture échoue
      console.error('Erreur génération écriture comptable:', error);
    }

    return recette;
  }

  async createDepense(societeId: string, dto: MouvementDto) {
    const depense = await this.prisma.depense.create({
      data: {
        societeId,
        date: new Date(dto.date),
        montant: dto.montant,
        description: dto.description,
      },
    });

    // Générer l'écriture comptable automatiquement
    try {
      await this.planComptableService.generateEcritureFromDepense(
        societeId,
        depense.id,
        depense.date,
        Number(depense.montant),
        depense.description || undefined,
      );
    } catch (error) {
      // Ne pas bloquer la création de la dépense si l'écriture échoue
      console.error('Erreur génération écriture comptable:', error);
    }

    return depense;
  }

  async getDashboard(
    societeId: string,
    from?: string,
    to?: string,
  ) {
    const whereBase = { societeId };
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    const whereRecette: any = { ...whereBase };
    const whereDepense: any = { ...whereBase };
    if (from || to) {
      whereRecette.date = { ...dateFilter };
      whereDepense.date = { ...dateFilter };
    }

    // Période N-1 (même période, année précédente) pour comparaison
    let totalRecettesN1 = 0;
    let totalDepensesN1 = 0;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      const fromN1 = new Date(fromDate.getFullYear() - 1, fromDate.getMonth(), fromDate.getDate());
      const toN1 = new Date(toDate.getFullYear() - 1, toDate.getMonth(), toDate.getDate());
      toN1.setHours(23, 59, 59, 999);
      const [sumR1, sumD1] = await Promise.all([
        this.prisma.recette.aggregate({
          where: { societeId, date: { gte: fromN1, lte: toN1 } },
          _sum: { montant: true },
        }),
        this.prisma.depense.aggregate({
          where: { societeId, date: { gte: fromN1, lte: toN1 } },
          _sum: { montant: true },
        }),
      ]);
      totalRecettesN1 = Number(sumR1._sum.montant ?? 0);
      totalDepensesN1 = Number(sumD1._sum.montant ?? 0);
    }

    const [sumRecettes, sumDepenses, comptesBancaires, factures] = await Promise.all([
      this.prisma.recette.aggregate({
        where: whereRecette,
        _sum: { montant: true },
      }),
      this.prisma.depense.aggregate({
        where: whereDepense,
        _sum: { montant: true },
      }),
      this.prisma.compteBancaire.findMany({
        where: { societeId },
        include: { transactions: true },
      }),
      this.prisma.facture.findMany({
        where: {
          societeId,
          statut: { in: ['ENVOYEE', 'BROUILLON'] },
        },
        include: { paiements: true },
      }),
    ]);

    const totalRecettes = Number(sumRecettes._sum.montant ?? 0);
    const totalDepenses = Number(sumDepenses._sum.montant ?? 0);
    const resultat = totalRecettes - totalDepenses;
    const resultatN1 = totalRecettesN1 - totalDepensesN1;

    // Solde trésorerie = somme des soldes de tous les comptes bancaires
    let soldeTresorerie = 0;
    for (const compte of comptesBancaires) {
      const credits = compte.transactions
        .filter((t) => t.type === 'CREDIT')
        .reduce((s, t) => s + Number(t.montant), 0);
      const debits = compte.transactions
        .filter((t) => t.type === 'DEBIT')
        .reduce((s, t) => s + Number(t.montant), 0);
      soldeTresorerie += Number(compte.soldeInitial ?? 0) + credits - debits;
    }

    // Total solde clients = somme des restes à payer (factures non payées)
    const totalSoldeClients = factures.reduce((sum, f) => {
      const totalPaye = f.paiements.reduce((s, p) => s + Number(p.montant), 0);
      return sum + (Number(f.totalTTC) - totalPaye);
    }, 0);

    // Solde fournisseurs (compte 401) - somme des écritures crédit - débit
    const compteFournisseurs = await this.prisma.compteComptable.findFirst({
      where: { code: '401' },
    });
    let totalSoldeFournisseurs = 0;
    if (compteFournisseurs) {
      const ecritures401 = await this.prisma.ecritureComptable.findMany({
        where: {
          societeId,
          OR: [
            { compteDebitId: compteFournisseurs.id },
            { compteCreditId: compteFournisseurs.id },
          ],
        },
      });
      let totalCredit = 0;
      let totalDebit = 0;
      for (const e of ecritures401) {
        if (e.compteCreditId === compteFournisseurs.id) {
          totalCredit += Number(e.montant);
        }
        if (e.compteDebitId === compteFournisseurs.id) {
          totalDebit += Number(e.montant);
        }
      }
      // Pour un compte passif (401/40), solde = crédit - débit
      totalSoldeFournisseurs = totalCredit - totalDebit;
    }

    // Solde notes de frais (somme des notes non validées ou en attente)
    const notesFrais = await this.prisma.noteFrais.findMany({
      where: {
        societeId,
        statut: { in: ['BROUILLON', 'EN_ATTENTE'] },
      },
    });
    const totalSoldeNotesFrais = notesFrais.reduce((sum, n) => sum + Number(n.montant), 0);

    return {
      totalRecettes,
      totalDepenses,
      resultat,
      totalRecettesN1,
      totalDepensesN1,
      resultatN1,
      soldeTresorerie,
      totalSoldeClients,
      totalSoldeFournisseurs,
      totalSoldeNotesFrais,
      from: from ?? null,
      to: to ?? null,
    };
  }

  async getDashboardGraphique(societeId: string, months: number = 6) {
    // Calculer la date de début (il y a X mois)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Récupérer toutes les recettes et dépenses sur la période
    const [recettes, depenses] = await Promise.all([
      this.prisma.recette.findMany({
        where: {
          societeId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          date: true,
          montant: true,
        },
      }),
      this.prisma.depense.findMany({
        where: {
          societeId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          date: true,
          montant: true,
        },
      }),
    ]);

    // Grouper par mois
    const dataByMonth: Record<string, { recettes: number; depenses: number }> = {};

    // Initialiser tous les mois de la période
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      dataByMonth[monthKey] = { recettes: 0, depenses: 0 };
    }

    // Agréger les recettes par mois
    recettes.forEach((r) => {
      const date = new Date(r.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (dataByMonth[monthKey]) {
        dataByMonth[monthKey].recettes += Number(r.montant);
      }
    });

    // Agréger les dépenses par mois
    depenses.forEach((d) => {
      const date = new Date(d.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (dataByMonth[monthKey]) {
        dataByMonth[monthKey].depenses += Number(d.montant);
      }
    });

    // Convertir en tableau trié
    const graphData = Object.entries(dataByMonth)
      .map(([month, data]) => ({
        mois: month,
        recettes: data.recettes,
        depenses: data.depenses,
        resultat: data.recettes - data.depenses,
      }))
      .sort((a, b) => a.mois.localeCompare(b.mois));

    return graphData;
  }

  async getFacturesImpayees(societeId: string, joursRetard: number = 30) {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - joursRetard);

    const factures = await this.prisma.facture.findMany({
      where: {
        societeId,
        statut: {
          in: ['ENVOYEE', 'BROUILLON'],
        },
        date: {
          lte: dateLimite,
        },
      },
      include: {
        client: true,
        paiements: true,
      },
      orderBy: { date: 'asc' },
    });

    // Filtrer celles qui ne sont pas complètement payées
    const facturesImpayees = factures.filter((f) => {
      const totalPaye = f.paiements.reduce(
        (sum, p) => sum + Number(p.montant),
        0,
      );
      return totalPaye < Number(f.totalTTC);
    });

    return facturesImpayees.map((f) => {
      const totalPaye = f.paiements.reduce(
        (sum, p) => sum + Number(p.montant),
        0,
      );
      const joursDepuisEmission = Math.floor(
        (new Date().getTime() - new Date(f.date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return {
        id: f.id,
        numero: f.numero,
        date: f.date,
        client: f.client.nom,
        totalTTC: f.totalTTC,
        totalPaye,
        resteAPayer: Number(f.totalTTC) - totalPaye,
        joursDepuisEmission,
      };
    });
  }
}

