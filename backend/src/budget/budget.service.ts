import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateOrUpdateBudgetDto {
  annee: number;
  budgetRecettes: number;
  budgetDepenses: number;
}

export interface BudgetAvecComparaison {
  id: string;
  societeId: string;
  annee: number;
  budgetRecettes: number;
  budgetDepenses: number;
  reelRecettes: number;
  reelDepenses: number;
  ecartRecettes: number;
  ecartDepenses: number;
  ecartResultat: number; // (reelRecettes - reelDepenses) - (budgetRecettes - budgetDepenses)
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdate(
    societeId: string,
    dto: CreateOrUpdateBudgetDto,
  ) {
    const { annee, budgetRecettes, budgetDepenses } = dto;
    return this.prisma.budget.upsert({
      where: {
        societeId_annee: { societeId, annee },
      },
      create: {
        societeId,
        annee,
        budgetRecettes,
        budgetDepenses,
      },
      update: {
        budgetRecettes,
        budgetDepenses,
      },
    });
  }

  async findAll(societeId: string) {
    return this.prisma.budget.findMany({
      where: { societeId },
      orderBy: { annee: 'desc' },
    });
  }

  async findOne(societeId: string, annee: number) {
    const budget = await this.prisma.budget.findUnique({
      where: {
        societeId_annee: { societeId, annee },
      },
    });
    return budget;
  }

  /**
   * Retourne le budget d'une année avec les montants réels (recettes/dépenses) et les écarts
   */
  async getAvecComparaison(
    societeId: string,
    annee: number,
  ): Promise<BudgetAvecComparaison | null> {
    const budget = await this.prisma.budget.findUnique({
      where: {
        societeId_annee: { societeId, annee },
      },
    });

    const from = `${annee}-01-01`;
    const to = `${annee}-12-31`;
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const [recettes, depenses] = await Promise.all([
      this.prisma.recette.aggregate({
        where: {
          societeId,
          date: {
            gte: new Date(from),
            lte: toDate,
          },
        },
        _sum: { montant: true },
      }),
      this.prisma.depense.aggregate({
        where: {
          societeId,
          date: {
            gte: new Date(from),
            lte: toDate,
          },
        },
        _sum: { montant: true },
      }),
    ]);

    const reelRecettes = Number(recettes._sum.montant ?? 0);
    const reelDepenses = Number(depenses._sum.montant ?? 0);

    if (!budget) {
      return null;
    }

    const budgetRecettes = Number(budget.budgetRecettes);
    const budgetDepenses = Number(budget.budgetDepenses);
    const ecartRecettes = reelRecettes - budgetRecettes;
    const ecartDepenses = reelDepenses - budgetDepenses;
    const resultatReel = reelRecettes - reelDepenses;
    const resultatBudget = budgetRecettes - budgetDepenses;
    const ecartResultat = resultatReel - resultatBudget;

    return {
      id: budget.id,
      societeId: budget.societeId,
      annee: budget.annee,
      budgetRecettes,
      budgetDepenses,
      reelRecettes,
      reelDepenses,
      ecartRecettes,
      ecartDepenses,
      ecartResultat,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

  /**
   * Liste tous les budgets avec comparaison (réel vs budget) pour les années ayant un budget
   */
  async listAvecComparaison(societeId: string) {
    const budgets = await this.findAll(societeId);
    const result: BudgetAvecComparaison[] = [];

    for (const budget of budgets) {
      const avecComparaison = await this.getAvecComparaison(
        societeId,
        budget.annee,
      );
      if (avecComparaison) {
        result.push(avecComparaison);
      }
    }

    return result;
  }

  async delete(societeId: string, annee: number) {
    await this.prisma.budget.delete({
      where: {
        societeId_annee: { societeId, annee },
      },
    });
    return { success: true };
  }
}
