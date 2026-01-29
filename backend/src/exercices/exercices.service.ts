import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateExerciceDto {
  annee: number;
  dateDebut: string; // Format ISO
  dateFin: string; // Format ISO
}

@Injectable()
export class ExercicesService {
  constructor(private readonly prisma: PrismaService) {}

  // Créer un nouvel exercice
  async createExercice(societeId: string, dto: CreateExerciceDto) {
    // Vérifier que la société existe
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
    });

    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    // Vérifier qu'il n'existe pas déjà un exercice pour cette année
    const existingExercice = await this.prisma.exercice.findUnique({
      where: {
        societeId_annee: {
          societeId,
          annee: dto.annee,
        },
      },
    });

    if (existingExercice) {
      throw new BadRequestException(
        `Un exercice pour l'année ${dto.annee} existe déjà`,
      );
    }

    // Vérifier que les dates sont valides
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);

    if (dateDebut >= dateFin) {
      throw new BadRequestException(
        'La date de début doit être antérieure à la date de fin',
      );
    }

    // Vérifier qu'il n'y a pas de chevauchement avec d'autres exercices
    const overlappingExercice = await this.prisma.exercice.findFirst({
      where: {
        societeId,
        OR: [
          {
            dateDebut: { lte: dateFin },
            dateFin: { gte: dateDebut },
          },
        ],
      },
    });

    if (overlappingExercice) {
      throw new BadRequestException(
        `Cet exercice chevauche avec l'exercice ${overlappingExercice.annee}`,
      );
    }

    return this.prisma.exercice.create({
      data: {
        societeId,
        annee: dto.annee,
        dateDebut,
        dateFin,
        statut: 'OUVERT',
      },
    });
  }

  // Lister tous les exercices d'une société
  listExercices(societeId: string) {
    return this.prisma.exercice.findMany({
      where: { societeId },
      orderBy: { annee: 'desc' },
    });
  }

  // Obtenir un exercice par ID
  async getExerciceById(societeId: string, exerciceId: string) {
    const exercice = await this.prisma.exercice.findFirst({
      where: {
        id: exerciceId,
        societeId,
      },
      include: {
        ecritures: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!exercice) {
      throw new NotFoundException('Exercice introuvable');
    }

    return exercice;
  }

  // Obtenir l'exercice en cours (ouvert) pour une société
  async getExerciceCourant(societeId: string) {
    const exercice = await this.prisma.exercice.findFirst({
      where: {
        societeId,
        statut: 'OUVERT',
      },
      orderBy: { annee: 'desc' },
    });

    return exercice;
  }

  // Trouver l'exercice correspondant à une date
  async findExerciceByDate(societeId: string, date: Date) {
    const exercice = await this.prisma.exercice.findFirst({
      where: {
        societeId,
        dateDebut: { lte: date },
        dateFin: { gte: date },
      },
    });

    return exercice;
  }

  // Fermer un exercice
  async fermerExercice(societeId: string, exerciceId: string) {
    const exercice = await this.prisma.exercice.findFirst({
      where: {
        id: exerciceId,
        societeId,
      },
    });

    if (!exercice) {
      throw new NotFoundException('Exercice introuvable');
    }

    if (exercice.statut === 'FERME') {
      throw new BadRequestException('Cet exercice est déjà fermé');
    }

    return this.prisma.exercice.update({
      where: { id: exerciceId },
      data: {
        statut: 'FERME',
        dateCloture: new Date(),
      },
    });
  }

  // Rouvrir un exercice (pour corrections)
  async rouvrirExercice(societeId: string, exerciceId: string) {
    const exercice = await this.prisma.exercice.findFirst({
      where: {
        id: exerciceId,
        societeId,
      },
    });

    if (!exercice) {
      throw new NotFoundException('Exercice introuvable');
    }

    if (exercice.statut === 'OUVERT') {
      throw new BadRequestException('Cet exercice est déjà ouvert');
    }

    // Vérifier qu'il n'y a pas d'autre exercice ouvert
    const exerciceOuvert = await this.prisma.exercice.findFirst({
      where: {
        societeId,
        statut: 'OUVERT',
        id: { not: exerciceId },
      },
    });

    if (exerciceOuvert) {
      throw new BadRequestException(
        `Impossible de rouvrir cet exercice. L'exercice ${exerciceOuvert.annee} est actuellement ouvert.`,
      );
    }

    return this.prisma.exercice.update({
      where: { id: exerciceId },
      data: {
        statut: 'OUVERT',
        dateCloture: null,
      },
    });
  }

  // Supprimer un exercice (seulement si fermé et sans écritures)
  async deleteExercice(societeId: string, exerciceId: string) {
    const exercice = await this.prisma.exercice.findFirst({
      where: {
        id: exerciceId,
        societeId,
      },
      include: {
        ecritures: true,
      },
    });

    if (!exercice) {
      throw new NotFoundException('Exercice introuvable');
    }

    if (exercice.statut === 'OUVERT') {
      throw new BadRequestException(
        'Impossible de supprimer un exercice ouvert',
      );
    }

    if (exercice.ecritures.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un exercice contenant des écritures comptables',
      );
    }

    return this.prisma.exercice.delete({
      where: { id: exerciceId },
    });
  }
}
