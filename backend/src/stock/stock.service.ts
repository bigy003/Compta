import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const UNITES = ['PIECE', 'KG', 'LITRE', 'METRE', 'CARTON', 'AUTRE'];

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  getUnites() {
    return UNITES;
  }

  // --- Produits ---
  async createProduit(
    societeId: string,
    dto: {
      reference: string;
      designation: string;
      unite?: string;
      quantiteEnStock?: number;
      seuilAlerte?: number;
    },
  ) {
    return this.prisma.produit.create({
      data: {
        societeId,
        reference: dto.reference.trim().toUpperCase(),
        designation: dto.designation,
        unite: dto.unite || 'PIECE',
        quantiteEnStock: dto.quantiteEnStock ?? 0,
        seuilAlerte: dto.seuilAlerte ?? null,
      },
    });
  }

  async findAllProduits(societeId: string) {
    return this.prisma.produit.findMany({
      where: { societeId },
      orderBy: { reference: 'asc' },
      include: {
        _count: { select: { mouvementsStock: true } },
      },
    });
  }

  async findOneProduit(societeId: string, produitId: string) {
    const p = await this.prisma.produit.findFirst({
      where: { id: produitId, societeId },
      include: {
        mouvementsStock: { orderBy: { date: 'desc' }, take: 20 },
      },
    });
    if (!p) throw new NotFoundException('Produit introuvable');
    return p;
  }

  async updateProduit(
    societeId: string,
    produitId: string,
    dto: Partial<{
      reference: string;
      designation: string;
      unite: string;
      seuilAlerte: number | null;
    }>,
  ) {
    await this.findOneProduit(societeId, produitId);
    const data: any = { ...dto };
    if (dto.reference) data.reference = dto.reference.trim().toUpperCase();
    return this.prisma.produit.update({
      where: { id: produitId },
      data,
    });
  }

  async deleteProduit(societeId: string, produitId: string) {
    await this.findOneProduit(societeId, produitId);
    await this.prisma.produit.delete({ where: { id: produitId } });
    return { success: true };
  }

  // --- Mouvements ---
  async createMouvement(
    societeId: string,
    dto: {
      produitId: string;
      type: 'ENTREE' | 'SORTIE';
      quantite: number;
      date: string;
      libelle?: string;
    },
  ) {
    const produit = await this.prisma.produit.findFirst({
      where: { id: dto.produitId, societeId },
    });
    if (!produit) throw new NotFoundException('Produit introuvable');

    const qte = Number(dto.quantite);
    if (qte <= 0) throw new Error('La quantité doit être strictement positive');

    const stockActuel = Number(produit.quantiteEnStock);
    if (dto.type === 'SORTIE' && qte > stockActuel) {
      throw new Error(
        `Stock insuffisant. Disponible: ${stockActuel}, demandé: ${qte}`,
      );
    }

    const nouveauStock =
      dto.type === 'ENTREE' ? stockActuel + qte : stockActuel - qte;

    const [mouvement] = await this.prisma.$transaction([
      this.prisma.mouvementStock.create({
        data: {
          societeId,
          produitId: dto.produitId,
          type: dto.type,
          quantite: qte,
          date: new Date(dto.date),
          libelle: dto.libelle,
        },
      }),
      this.prisma.produit.update({
        where: { id: dto.produitId },
        data: { quantiteEnStock: nouveauStock },
      }),
    ]);

    return mouvement;
  }

  async listMouvements(societeId: string, produitId?: string) {
    const where: any = { societeId };
    if (produitId) where.produitId = produitId;
    return this.prisma.mouvementStock.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { produit: true },
    });
  }

  // --- Inventaires ---
  async createInventaire(
    societeId: string,
    dto: { dateInventaire: string; commentaire?: string },
  ) {
    return this.prisma.inventaire.create({
      data: {
        societeId,
        dateInventaire: new Date(dto.dateInventaire),
        commentaire: dto.commentaire,
        statut: 'BROUILLON',
      },
    });
  }

  async findAllInventaires(societeId: string) {
    return this.prisma.inventaire.findMany({
      where: { societeId },
      orderBy: { dateInventaire: 'desc' },
      include: {
        lignesInventaire: { include: { produit: true } },
      },
    });
  }

  async findOneInventaire(societeId: string, inventaireId: string) {
    const inv = await this.prisma.inventaire.findFirst({
      where: { id: inventaireId, societeId },
      include: {
        lignesInventaire: { include: { produit: true } },
      },
    });
    if (!inv) throw new NotFoundException('Inventaire introuvable');
    return inv;
  }

  async ajouterLigneInventaire(
    societeId: string,
    inventaireId: string,
    dto: { produitId: string; quantiteComptee: number },
  ) {
    const inventaire = await this.findOneInventaire(societeId, inventaireId);
    if (inventaire.statut === 'CLOTURE') {
      throw new Error('Impossible de modifier un inventaire clôturé');
    }

    const produit = await this.prisma.produit.findFirst({
      where: { id: dto.produitId, societeId },
    });
    if (!produit) throw new NotFoundException('Produit introuvable');

    const quantiteSysteme = Number(produit.quantiteEnStock);
    const quantiteComptee = Number(dto.quantiteComptee);

    return this.prisma.ligneInventaire.upsert({
      where: {
        inventaireId_produitId: {
          inventaireId,
          produitId: dto.produitId,
        },
      },
      create: {
        inventaireId,
        produitId: dto.produitId,
        quantiteComptee,
        quantiteSysteme,
      },
      update: { quantiteComptee },
    });
  }

  async cloturerInventaire(societeId: string, inventaireId: string) {
    const inventaire = await this.findOneInventaire(societeId, inventaireId);
    if (inventaire.statut === 'CLOTURE') {
      throw new Error('Cet inventaire est déjà clôturé');
    }

    const lignes = inventaire.lignesInventaire;
    const dateInv = inventaire.dateInventaire;

    await this.prisma.$transaction(async (tx) => {
      for (const ligne of lignes) {
        const ecart =
          Number(ligne.quantiteComptee) - Number(ligne.quantiteSysteme);
        if (ecart === 0) continue;

        const type = ecart > 0 ? 'ENTREE' : 'SORTIE';
        const quantite = Math.abs(ecart);

        await tx.mouvementStock.create({
          data: {
            societeId,
            produitId: ligne.produitId,
            type,
            quantite,
            date: dateInv,
            libelle: `Inventaire ${inventaire.dateInventaire.toISOString().split('T')[0]}`,
          },
        });

        const produit = await tx.produit.findUnique({
          where: { id: ligne.produitId },
        });
        if (produit) {
          const nouveauStock =
            Number(produit.quantiteEnStock) + (type === 'ENTREE' ? quantite : -quantite);
          await tx.produit.update({
            where: { id: ligne.produitId },
            data: { quantiteEnStock: nouveauStock },
          });
        }
      }

      await tx.inventaire.update({
        where: { id: inventaireId },
        data: { statut: 'CLOTURE' },
      });
    });

    return this.findOneInventaire(societeId, inventaireId);
  }

  async getProduitsEnAlerte(societeId: string) {
    const produits = await this.prisma.produit.findMany({
      where: { societeId },
    });
    return produits.filter((p) => {
      const seuil = p.seuilAlerte != null ? Number(p.seuilAlerte) : null;
      const stock = Number(p.quantiteEnStock);
      return seuil != null && stock < seuil;
    });
  }
}
