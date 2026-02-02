import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateImmobilisationDto } from './dto/create-immobilisation.dto';
import { UpdateImmobilisationDto } from './dto/update-immobilisation.dto';

export interface LigneAmortissement {
  annee: number;
  montant: number;
  cumul: number;
  valeurNette: number;
}

@Injectable()
export class ImmobilisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(societeId: string, dto: CreateImmobilisationDto) {
    const {
      designation,
      categorie,
      dateAcquisition,
      valeurOrigine,
      dureeAnnees,
      methode = 'LINEAIRE',
      commentaire,
    } = dto;
    return this.prisma.immobilisation.create({
      data: {
        societeId,
        designation,
        categorie,
        dateAcquisition: new Date(dateAcquisition),
        valeurOrigine: new Decimal(valeurOrigine),
        dureeAnnees,
        methode,
        commentaire: commentaire ?? undefined,
      },
    });
  }

  async findAll(societeId: string) {
    return this.prisma.immobilisation.findMany({
      where: { societeId },
      orderBy: { dateAcquisition: 'desc' },
    });
  }

  async findOne(societeId: string, id: string) {
    const immo = await this.prisma.immobilisation.findFirst({
      where: { id, societeId },
    });
    if (!immo) return null;
    return immo;
  }

  async update(societeId: string, id: string, dto: UpdateImmobilisationDto) {
    await this.findOne(societeId, id);
    const data: Record<string, unknown> = {};
    if (dto.designation != null) data.designation = dto.designation;
    if (dto.categorie != null) data.categorie = dto.categorie;
    if (dto.dateAcquisition != null) data.dateAcquisition = new Date(dto.dateAcquisition);
    if (dto.valeurOrigine != null) data.valeurOrigine = new Decimal(dto.valeurOrigine);
    if (dto.dureeAnnees != null) data.dureeAnnees = dto.dureeAnnees;
    if (dto.methode != null) data.methode = dto.methode;
    if (dto.commentaire !== undefined) data.commentaire = dto.commentaire;
    return this.prisma.immobilisation.update({
      where: { id },
      data,
    });
  }

  async delete(societeId: string, id: string) {
    await this.findOne(societeId, id);
    return this.prisma.immobilisation.delete({ where: { id } });
  }

  /**
   * Calcule le plan d'amortissement (méthode linéaire, prorata temporis 1ère année).
   * Retourne les lignes année par année.
   */
  async getPlanAmortissement(societeId: string, immobilisationId: string): Promise<LigneAmortissement[]> {
    const immo = await this.prisma.immobilisation.findFirst({ where: { id: immobilisationId, societeId } });
    if (!immo) return [];
    const valeurOrigine = Number(immo.valeurOrigine);
    const dureeAnnees = immo.dureeAnnees;
    const dateAcq = new Date(immo.dateAcquisition);
    const anneeAcq = dateAcq.getFullYear();
    const moisAcq = dateAcq.getMonth(); // 0-11
    const dotationPleine = valeurOrigine / dureeAnnees;
    // Prorata temporis : 1ère année = mois restants / 12
    const premiereAnnee = dotationPleine * ((12 - moisAcq) / 12);
    const lignes: LigneAmortissement[] = [];
    let cumul = 0;

    for (let i = 0; i < dureeAnnees; i++) {
      const annee = anneeAcq + i;
      let montant: number;
      if (i === 0) {
        montant = premiereAnnee;
      } else if (i === dureeAnnees - 1) {
        montant = valeurOrigine - cumul;
      } else {
        montant = dotationPleine;
      }
      cumul += montant;
      const valeurNette = Math.max(0, valeurOrigine - cumul);
      lignes.push({ annee, montant, cumul, valeurNette });
    }
    return lignes;
  }

  /** Retourne l'immobilisation avec son plan d'amortissement (pour l'API). */
  async getOneAvecPlan(societeId: string, id: string) {
    const immo = await this.findOne(societeId, id);
    if (!immo) return null;
    const plan = await this.getPlanAmortissement(societeId, id);
    return {
      ...immo,
      valeurOrigine: Number(immo.valeurOrigine),
      planAmortissement: plan,
    };
  }
}
