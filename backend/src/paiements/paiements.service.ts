import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePaiementDto {
  date: string;
  montant: number;
  methode: string;
  reference?: string;
  notes?: string;
}

@Injectable()
export class PaiementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByFacture(societeId: string, factureId: string) {
    // Vérifier que la facture appartient à la société
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    return this.prisma.paiement.findMany({
      where: { factureId },
      orderBy: { date: 'desc' },
    });
  }

  async createPaiement(
    societeId: string,
    factureId: string,
    dto: CreatePaiementDto,
  ) {
    // Vérifier que la facture appartient à la société
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
      include: { paiements: true },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    // Calculer le total déjà payé
    const totalPaye = facture.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    // Vérifier que le nouveau paiement ne dépasse pas le montant restant
    const montantRestant = Number(facture.totalTTC) - totalPaye;
    if (dto.montant > montantRestant) {
      throw new Error(
        `Le montant du paiement (${dto.montant}) dépasse le montant restant dû (${montantRestant})`,
      );
    }

    // Créer le paiement
    const paiement = await this.prisma.paiement.create({
      data: {
        factureId,
        date: new Date(dto.date),
        montant: dto.montant,
        methode: dto.methode,
        reference: dto.reference,
        notes: dto.notes,
      },
    });

    // Recalculer le total payé après ce nouveau paiement
    const nouveauTotalPaye = totalPaye + dto.montant;
    const nouveauMontantRestant = Number(facture.totalTTC) - nouveauTotalPaye;

    // Mettre à jour le statut de la facture
    let nouveauStatut = facture.statut;
    if (nouveauMontantRestant <= 0) {
      nouveauStatut = 'PAYEE';
    } else if (facture.statut === 'BROUILLON') {
      // Si la facture était en brouillon et qu'un paiement est enregistré, passer à ENVOYEE
      nouveauStatut = 'ENVOYEE';
    }

    await this.prisma.facture.update({
      where: { id: factureId },
      data: { statut: nouveauStatut },
    });

    return paiement;
  }

  async deletePaiement(
    societeId: string,
    factureId: string,
    paiementId: string,
  ) {
    // Vérifier que la facture appartient à la société
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    const paiement = await this.prisma.paiement.findFirst({
      where: { id: paiementId, factureId },
    });

    if (!paiement) {
      throw new NotFoundException('Paiement introuvable');
    }

    // Supprimer le paiement
    await this.prisma.paiement.delete({
      where: { id: paiementId },
    });

    // Recalculer le statut de la facture
    const paiementsRestants = await this.prisma.paiement.findMany({
      where: { factureId },
    });

    const totalPaye = paiementsRestants.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    const montantRestant = Number(facture.totalTTC) - totalPaye;

    let nouveauStatut = facture.statut;
    if (montantRestant <= 0) {
      nouveauStatut = 'PAYEE';
    } else if (totalPaye === 0) {
      // Si plus aucun paiement, revenir à ENVOYEE si ce n'était pas BROUILLON
      if (facture.statut === 'PAYEE') {
        nouveauStatut = 'ENVOYEE';
      }
    } else {
      // Si paiement partiel, rester ENVOYEE
      nouveauStatut = 'ENVOYEE';
    }

    await this.prisma.facture.update({
      where: { id: factureId },
      data: { statut: nouveauStatut },
    });

    return { message: 'Paiement supprimé avec succès' };
  }

  async getHistoriquePaiements(societeId: string, factureId: string) {
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
      include: {
        paiements: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    const totalPaye = facture.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    const montantRestant = Number(facture.totalTTC) - totalPaye;

    return {
      facture: {
        id: facture.id,
        numero: facture.numero,
        date: facture.date,
        totalTTC: facture.totalTTC,
        statut: facture.statut,
      },
      paiements: facture.paiements,
      totalPaye,
      montantRestant,
      estPayee: montantRestant <= 0,
    };
  }
}
