import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateNoteFraisDto {
  date: string;
  montant: number;
  description?: string;
  categorie?: string;
}

@Injectable()
export class NotesFraisService {
  constructor(private readonly prisma: PrismaService) {}

  listBySociete(societeId: string, from?: string, to?: string) {
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

    return this.prisma.noteFrais.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async createForSociete(societeId: string, dto: CreateNoteFraisDto) {
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
    });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    return this.prisma.noteFrais.create({
      data: {
        societeId,
        date: new Date(dto.date),
        montant: dto.montant,
        description: dto.description,
        categorie: dto.categorie,
        statut: 'BROUILLON',
      },
    });
  }

  async updateStatut(societeId: string, noteFraisId: string, statut: string) {
    const noteFrais = await this.prisma.noteFrais.findFirst({
      where: { id: noteFraisId, societeId },
    });

    if (!noteFrais) {
      throw new NotFoundException('Note de frais introuvable');
    }

    const statutsValides = ['BROUILLON', 'EN_ATTENTE', 'VALIDEE', 'REFUSEE'];
    if (!statutsValides.includes(statut)) {
      throw new Error(`Statut invalide. Statuts autorisés: ${statutsValides.join(', ')}`);
    }

    return this.prisma.noteFrais.update({
      where: { id: noteFraisId },
      data: { statut },
    });
  }

  async update(societeId: string, noteFraisId: string, dto: Partial<CreateNoteFraisDto>) {
    const noteFrais = await this.prisma.noteFrais.findFirst({
      where: { id: noteFraisId, societeId },
    });

    if (!noteFrais) {
      throw new NotFoundException('Note de frais introuvable');
    }

    const updateData: any = {};
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.montant !== undefined) updateData.montant = dto.montant;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.categorie !== undefined) updateData.categorie = dto.categorie;

    return this.prisma.noteFrais.update({
      where: { id: noteFraisId },
      data: updateData,
    });
  }

  async delete(societeId: string, noteFraisId: string) {
    const noteFrais = await this.prisma.noteFrais.findFirst({
      where: { id: noteFraisId, societeId },
    });

    if (!noteFrais) {
      throw new NotFoundException('Note de frais introuvable');
    }

    return this.prisma.noteFrais.delete({
      where: { id: noteFraisId },
    });
  }

  async updateJustificatif(societeId: string, noteFraisId: string, justificatifUrl: string) {
    const noteFrais = await this.prisma.noteFrais.findFirst({
      where: { id: noteFraisId, societeId },
    });

    if (!noteFrais) {
      throw new NotFoundException('Note de frais introuvable');
    }

    return this.prisma.noteFrais.update({
      where: { id: noteFraisId },
      data: { justificatifUrl },
    });
  }
}
