import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EcheanceFiscaleDto {
  id: string;
  societeId: string;
  type: string;
  libelle: string;
  dateEcheance: Date;
  periode?: string;
  statut: string;
  montantEstime?: number;
  dateRealisation?: Date;
  reference?: string;
  notes?: string;
  rappel7Jours: boolean;
  rappel3Jours: boolean;
  rappelJourJ: boolean;
  rappelRetard: boolean;
  declarationTVAId?: string;
}

@Injectable()
export class EcheancesFiscalesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère automatiquement les échéances fiscales pour une société pour l'année en cours
   */
  async genererEcheancesAnnuelles(societeId: string, annee: number = new Date().getFullYear()): Promise<void> {
    const societe = await this.prisma.societe.findUnique({ where: { id: societeId } });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    // Supprimer les échéances futures non réalisées pour éviter les doublons
    await this.prisma.echeanceFiscale.deleteMany({
      where: {
        societeId,
        dateEcheance: { gte: new Date(annee, 0, 1) },
        statut: { in: ['A_FAIRE', 'EN_COURS'] },
      },
    });

    const echeances: Array<{
      type: string;
      libelle: string;
      dateEcheance: Date;
      periode: string;
    }> = [];

    // TVA mensuelle : le 15 de chaque mois pour la période précédente
    for (let mois = 1; mois <= 12; mois++) {
      const dateEcheance = new Date(annee, mois - 1, 15); // 15 du mois
      const periode = `${annee}-${String(mois).padStart(2, '0')}`;
      echeances.push({
        type: 'TVA',
        libelle: `Déclaration TVA mensuelle - ${periode}`,
        dateEcheance,
        periode,
      });
    }

    // IS (Impôt sur les Sociétés) : déclaration annuelle avant le 30 avril de l'année suivante
    const dateIS = new Date(annee + 1, 3, 30); // 30 avril année suivante
    echeances.push({
      type: 'IS',
      libelle: `Déclaration IS (Impôt sur les Sociétés) - Exercice ${annee}`,
      dateEcheance: dateIS,
      periode: String(annee),
    });

    // CNPS (Caisse Nationale de Prévoyance Sociale) : déclaration mensuelle le 15
    for (let mois = 1; mois <= 12; mois++) {
      const dateEcheance = new Date(annee, mois - 1, 15);
      const periode = `${annee}-${String(mois).padStart(2, '0')}`;
      echeances.push({
        type: 'CNPS',
        libelle: `Déclaration CNPS - ${periode}`,
        dateEcheance,
        periode,
      });
    }

    // Retenue à la source : mensuelle le 15
    for (let mois = 1; mois <= 12; mois++) {
      const dateEcheance = new Date(annee, mois - 1, 15);
      const periode = `${annee}-${String(mois).padStart(2, '0')}`;
      echeances.push({
        type: 'RETENUE_SOURCE',
        libelle: `Déclaration retenue à la source - ${periode}`,
        dateEcheance,
        periode,
      });
    }

    // Créer toutes les échéances
    for (const echeance of echeances) {
      await this.prisma.echeanceFiscale.create({
        data: {
          societeId,
          type: echeance.type,
          libelle: echeance.libelle,
          dateEcheance: echeance.dateEcheance,
          periode: echeance.periode,
          statut: 'A_FAIRE',
        },
      });
    }
  }

  /**
   * Récupère toutes les échéances d'une société avec filtres optionnels
   */
  async getEcheances(
    societeId: string,
    filters?: {
      type?: string;
      statut?: string;
      dateDebut?: Date;
      dateFin?: Date;
    },
  ) {
    const where: any = { societeId };
    if (filters?.type) where.type = filters.type;
    if (filters?.statut) where.statut = filters.statut;
    if (filters?.dateDebut || filters?.dateFin) {
      where.dateEcheance = {};
      if (filters.dateDebut) where.dateEcheance.gte = filters.dateDebut;
      if (filters.dateFin) where.dateEcheance.lte = filters.dateFin;
    }

    return this.prisma.echeanceFiscale.findMany({
      where,
      orderBy: { dateEcheance: 'asc' },
    });
  }

  /**
   * Met à jour le statut d'une échéance
   */
  async updateStatut(
    societeId: string,
    echeanceId: string,
    statut: string,
    dateRealisation?: Date,
    reference?: string,
  ) {
    const echeance = await this.prisma.echeanceFiscale.findFirst({
      where: { id: echeanceId, societeId },
    });
    if (!echeance) {
      throw new NotFoundException('Échéance introuvable');
    }

    return this.prisma.echeanceFiscale.update({
      where: { id: echeanceId },
      data: {
        statut,
        dateRealisation: dateRealisation || new Date(),
        reference,
      },
    });
  }

  /**
   * Calcule le montant estimé pour une échéance TVA basé sur les déclarations précédentes
   */
  async calculerMontantEstimeTVA(societeId: string, periode: string): Promise<number | null> {
    // Récupérer la déclaration TVA de la période précédente pour estimation
    const [annee, mois] = periode.split('-').map(Number);
    const periodePrecedente = mois === 1 
      ? `${annee - 1}-12`
      : `${annee}-${String(mois - 1).padStart(2, '0')}`;

    const declarationPrecedente = await this.prisma.declarationTVA.findFirst({
      where: {
        societeId,
        periode: periodePrecedente,
      },
      orderBy: { dateDeclaration: 'desc' },
    });

    if (declarationPrecedente) {
      return Number(declarationPrecedente.tvaAPayer);
    }

    // Sinon, moyenne des 3 derniers mois
    const troisDerniersMois = await this.prisma.declarationTVA.findMany({
      where: {
        societeId,
        statut: 'VALIDEE',
      },
      orderBy: { dateDeclaration: 'desc' },
      take: 3,
    });

    if (troisDerniersMois.length > 0) {
      const moyenne = troisDerniersMois.reduce(
        (sum, d) => sum + Number(d.tvaAPayer),
        0,
      ) / troisDerniersMois.length;
      return Math.round(moyenne * 100) / 100;
    }

    return null;
  }

  /**
   * Met à jour automatiquement les montants estimés pour toutes les échéances TVA à venir
   */
  async mettreAJourMontantsEstimes(societeId: string): Promise<void> {
    const echeancesTVA = await this.prisma.echeanceFiscale.findMany({
      where: {
        societeId,
        type: 'TVA',
        statut: { in: ['A_FAIRE', 'EN_COURS'] },
        dateEcheance: { gte: new Date() },
      },
    });

    for (const echeance of echeancesTVA) {
      if (echeance.periode) {
        try {
          const montantEstime = await this.calculerMontantEstimeTVA(societeId, echeance.periode);
          if (montantEstime !== null) {
            await this.prisma.echeanceFiscale.updateMany({
              where: { 
                id: echeance.id,
                societeId, // Vérification supplémentaire pour éviter les erreurs
              },
              data: { montantEstime: montantEstime },
            });
          }
        } catch (error) {
          // Ignorer les erreurs si l'échéance n'existe plus (supprimée entre-temps)
          // ou autres erreurs non critiques
          console.warn(`Impossible de mettre à jour l'échéance ${echeance.id}:`, error);
        }
      }
    }
  }

  /**
   * Récupère les échéances nécessitant un rappel (7 jours, 3 jours, jour J, retard)
   */
  async getEcheancesPourRappel(societeId: string): Promise<{
    rappel7Jours: EcheanceFiscaleDto[];
    rappel3Jours: EcheanceFiscaleDto[];
    rappelJourJ: EcheanceFiscaleDto[];
    rappelRetard: EcheanceFiscaleDto[];
  }> {
    const maintenant = new Date();
    const dans7Jours = new Date(maintenant.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dans3Jours = new Date(maintenant.getTime() + 3 * 24 * 60 * 60 * 1000);
    const demain = new Date(maintenant.getTime() + 24 * 60 * 60 * 1000);

    const toutesEcheances = await this.prisma.echeanceFiscale.findMany({
      where: {
        societeId,
        statut: { in: ['A_FAIRE', 'EN_COURS'] },
      },
    });

    const rappel7Jours = toutesEcheances.filter(
      (e) =>
        !e.rappel7Jours &&
        e.dateEcheance <= dans7Jours &&
        e.dateEcheance > dans3Jours,
    );

    const rappel3Jours = toutesEcheances.filter(
      (e) =>
        !e.rappel3Jours &&
        e.dateEcheance <= dans3Jours &&
        e.dateEcheance > demain,
    );

    const rappelJourJ = toutesEcheances.filter(
      (e) =>
        !e.rappelJourJ &&
        e.dateEcheance <= demain &&
        e.dateEcheance >= maintenant,
    );

    const rappelRetard = toutesEcheances.filter(
      (e) => !e.rappelRetard && e.dateEcheance < maintenant,
    );

    return {
      rappel7Jours: rappel7Jours.map(this.mapToDto),
      rappel3Jours: rappel3Jours.map(this.mapToDto),
      rappelJourJ: rappelJourJ.map(this.mapToDto),
      rappelRetard: rappelRetard.map(this.mapToDto),
    };
  }

  /**
   * Marque un rappel comme envoyé
   */
  async marquerRappelEnvoye(
    societeId: string,
    echeanceId: string,
    typeRappel: 'rappel7Jours' | 'rappel3Jours' | 'rappelJourJ' | 'rappelRetard',
  ): Promise<void> {
    await this.prisma.echeanceFiscale.updateMany({
      where: { id: echeanceId, societeId },
      data: { [typeRappel]: true },
    });
  }

  /**
   * Met à jour automatiquement les statuts des échéances (A_FAIRE → EN_RETARD si dépassé)
   */
  async mettreAJourStatuts(societeId: string): Promise<void> {
    try {
      const maintenant = new Date();
      await this.prisma.echeanceFiscale.updateMany({
        where: {
          societeId,
          statut: 'A_FAIRE',
          dateEcheance: { lt: maintenant },
        },
        data: { statut: 'EN_RETARD' },
      });
    } catch (error) {
      console.warn(`Erreur lors de la mise à jour des statuts pour la société ${societeId}:`, error);
      // Ne pas faire échouer la requête si la mise à jour échoue
    }
  }

  private mapToDto(e: any): EcheanceFiscaleDto {
    return {
      id: e.id,
      societeId: e.societeId,
      type: e.type,
      libelle: e.libelle,
      dateEcheance: e.dateEcheance,
      periode: e.periode,
      statut: e.statut,
      montantEstime: e.montantEstime ? Number(e.montantEstime) : undefined,
      dateRealisation: e.dateRealisation,
      reference: e.reference,
      notes: e.notes,
      rappel7Jours: e.rappel7Jours,
      rappel3Jours: e.rappel3Jours,
      rappelJourJ: e.rappelJourJ,
      rappelRetard: e.rappelRetard,
      declarationTVAId: e.declarationTVAId,
    };
  }
}
