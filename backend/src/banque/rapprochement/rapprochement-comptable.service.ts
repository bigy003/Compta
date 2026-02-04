import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RapprochementComptableDto {
  id: string;
  societeId: string;
  transactionBancaireId: string;
  ecritureComptableId?: string;
  compteComptableId?: string;
  montant: number;
  dateRapprochement: Date;
  statut: string;
  scoreConfiance?: number;
  notes?: string;
}

@Injectable()
export class RapprochementComptableService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un rapprochement entre une transaction bancaire et une écriture comptable
   */
  async creerRapprochement(
    societeId: string,
    transactionBancaireId: string,
    ecritureComptableId?: string,
    compteComptableId?: string,
    scoreConfiance?: number,
    notes?: string,
  ): Promise<RapprochementComptableDto> {
    // Vérifier que la transaction existe
    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: {
        id: transactionBancaireId,
        compteBancaire: { societeId },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction bancaire introuvable');
    }

    // Vérifier que l'écriture existe si fournie
    if (ecritureComptableId) {
      const ecriture = await this.prisma.ecritureComptable.findFirst({
        where: {
          id: ecritureComptableId,
          societeId,
        },
      });

      if (!ecriture) {
        throw new NotFoundException('Écriture comptable introuvable');
      }
    }

    // Vérifier qu'il n'y a pas déjà un rapprochement pour cette transaction
    const existing = await this.prisma.rapprochementComptable.findFirst({
      where: {
        transactionBancaireId,
        statut: { in: ['PENDING', 'VALIDATED'] },
      },
    });

    if (existing) {
      throw new Error('Cette transaction a déjà un rapprochement en cours');
    }

    const rapprochement = await this.prisma.rapprochementComptable.create({
      data: {
        societeId,
        transactionBancaireId,
        ecritureComptableId: ecritureComptableId || undefined,
        compteComptableId: compteComptableId || undefined,
        montant: transaction.montant,
        scoreConfiance: scoreConfiance || undefined,
        notes: notes || undefined,
        statut: 'PENDING',
      },
      include: {
        transactionBancaire: {
          include: { compteBancaire: true },
        },
        ecritureComptable: true,
        compteComptable: true,
      },
    });

    return this.mapToDto(rapprochement);
  }

  /**
   * Valide un rapprochement
   */
  async validerRapprochement(
    societeId: string,
    rapprochementId: string,
  ): Promise<RapprochementComptableDto> {
    const rapprochement = await this.prisma.rapprochementComptable.findFirst({
      where: { id: rapprochementId, societeId },
      include: {
        transactionBancaire: true,
        ecritureComptable: true,
      },
    });

    if (!rapprochement) {
      throw new NotFoundException('Rapprochement introuvable');
    }

    if (rapprochement.statut === 'VALIDATED') {
      throw new Error('Ce rapprochement est déjà validé');
    }

    // Mettre à jour le statut
    const updated = await this.prisma.rapprochementComptable.update({
      where: { id: rapprochementId },
      data: {
        statut: 'VALIDATED',
      },
      include: {
        transactionBancaire: {
          include: { compteBancaire: true },
        },
        ecritureComptable: true,
        compteComptable: true,
      },
    });

    // Marquer la transaction comme rapprochée
    await this.prisma.transactionBancaire.update({
      where: { id: rapprochement.transactionBancaireId },
      data: { rapproche: true },
    });

    return this.mapToDto(updated);
  }

  /**
   * Rejette un rapprochement
   */
  async rejeterRapprochement(
    societeId: string,
    rapprochementId: string,
  ): Promise<RapprochementComptableDto> {
    const rapprochement = await this.prisma.rapprochementComptable.findFirst({
      where: { id: rapprochementId, societeId },
    });

    if (!rapprochement) {
      throw new NotFoundException('Rapprochement introuvable');
    }

    const updated = await this.prisma.rapprochementComptable.update({
      where: { id: rapprochementId },
      data: { statut: 'REJECTED' },
      include: {
        transactionBancaire: {
          include: { compteBancaire: true },
        },
        ecritureComptable: true,
        compteComptable: true,
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Liste les rapprochements pour une société
   */
  async getRapprochements(
    societeId: string,
    filters?: {
      statut?: string;
      compteBancaireId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<RapprochementComptableDto[]> {
    const where: any = { societeId };
    if (filters?.statut) where.statut = filters.statut;

    if (filters?.compteBancaireId) {
      where.transactionBancaire = { compteBancaireId: filters.compteBancaireId };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.dateRapprochement = {};
      if (filters.dateFrom) where.dateRapprochement.gte = filters.dateFrom;
      if (filters.dateTo) where.dateRapprochement.lte = filters.dateTo;
    }

    const rapprochements = await this.prisma.rapprochementComptable.findMany({
      where,
      include: {
        transactionBancaire: {
          include: { compteBancaire: true },
        },
        ecritureComptable: {
          include: {
            compteDebit: true,
            compteCredit: true,
          },
        },
        compteComptable: true,
      },
      orderBy: { dateRapprochement: 'desc' },
    });

    return rapprochements.map(this.mapToDto);
  }

  /**
   * Trouve les écritures comptables potentielles pour une transaction bancaire
   */
  async trouverEcrituresPotentielles(
    societeId: string,
    transactionBancaireId: string,
    toleranceJours: number = 7,
    toleranceMontant: number = 0.01, // 1 centime de tolérance
  ): Promise<Array<{ ecriture: any; score: number }>> {
    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: {
        id: transactionBancaireId,
        compteBancaire: { societeId },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction bancaire introuvable');
    }

    const montant = Number(transaction.montant);
    const dateTransaction = transaction.date;

    // Trouver le compte 512 (Banque) pour cette société
    const compteBanque = await this.prisma.compteComptable.findFirst({
      where: {
        code: '512',
      },
    });

    if (!compteBanque) {
      return [];
    }

    // Rechercher les écritures qui pourraient correspondre
    const dateFrom = new Date(dateTransaction);
    dateFrom.setDate(dateFrom.getDate() - toleranceJours);
    const dateTo = new Date(dateTransaction);
    dateTo.setDate(dateTo.getDate() + toleranceJours);

    const ecritures = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
        OR: [
          { compteDebitId: compteBanque.id },
          { compteCreditId: compteBanque.id },
        ],
      },
      include: {
        compteDebit: true,
        compteCredit: true,
      },
    });

    // Calculer un score pour chaque écriture
    const resultats = ecritures
      .map((ecriture) => {
        let score = 0;

        // Score par montant (exact = 50 points)
        const montantEcriture = Number(ecriture.montant);
        if (Math.abs(montantEcriture - montant) <= toleranceMontant) {
          score += 50;
        } else {
          // Score dégressif selon l'écart
          const ecart = Math.abs(montantEcriture - montant);
          const pourcentageEcart = (ecart / montant) * 100;
          if (pourcentageEcart <= 5) score += 30;
          else if (pourcentageEcart <= 10) score += 15;
        }

        // Score par date (exact = 30 points)
        const joursDiff = Math.abs(
          (ecriture.date.getTime() - dateTransaction.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (joursDiff === 0) score += 30;
        else if (joursDiff <= 1) score += 20;
        else if (joursDiff <= 3) score += 10;

        // Score par libellé (mots communs = 20 points)
        const libelleTransaction = transaction.libelle.toLowerCase();
        const libelleEcriture = ecriture.libelle.toLowerCase();
        const motsCommuns = libelleTransaction
          .split(/\s+/)
          .filter((mot) => mot.length > 3 && libelleEcriture.includes(mot));
        score += Math.min(motsCommuns.length * 5, 20);

        return { ecriture, score };
      })
      .filter((r) => r.score >= 30) // Seulement les écritures avec score >= 30
      .sort((a, b) => b.score - a.score);

    return resultats;
  }

  private mapToDto(r: any): RapprochementComptableDto {
    return {
      id: r.id,
      societeId: r.societeId,
      transactionBancaireId: r.transactionBancaireId,
      ecritureComptableId: r.ecritureComptableId,
      compteComptableId: r.compteComptableId,
      montant: Number(r.montant),
      dateRapprochement: r.dateRapprochement,
      statut: r.statut,
      scoreConfiance: r.scoreConfiance ? Number(r.scoreConfiance) : undefined,
      notes: r.notes,
    };
  }
}
