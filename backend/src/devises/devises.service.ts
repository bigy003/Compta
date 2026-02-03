import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DeviseDto {
  id: string;
  code: string;
  nom: string;
  symbole: string;
  estParDefaut: boolean;
  actif: boolean;
}

export interface TauxChangeDto {
  id: string;
  deviseId: string;
  deviseBase: string;
  taux: number;
  date: Date;
  source: string;
}

@Injectable()
export class DevisesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère toutes les devises actives
   */
  async getAllDevises(): Promise<DeviseDto[]> {
    const devises = await this.prisma.devise.findMany({
      where: { actif: true },
      orderBy: [{ estParDefaut: 'desc' }, { code: 'asc' }],
    });
    return devises.map(this.mapToDto);
  }

  /**
   * Récupère une devise par son code
   */
  async getDeviseByCode(code: string): Promise<DeviseDto> {
    const devise = await this.prisma.devise.findUnique({
      where: { code },
    });
    if (!devise) {
      throw new NotFoundException(`Devise ${code} introuvable`);
    }
    return this.mapToDto(devise);
  }

  /**
   * Récupère le taux de change actuel pour une devise
   */
  async getTauxChangeActuel(codeDevise: string): Promise<number> {
    const devise = await this.prisma.devise.findUnique({
      where: { code: codeDevise },
    });
    if (!devise) {
      throw new NotFoundException(`Devise ${codeDevise} introuvable`);
    }

    // Si XOF (devise de base), retourner 1
    if (codeDevise === 'XOF') {
      return 1;
    }

    // Récupérer le dernier taux de change
    const dernierTaux = await this.prisma.tauxChange.findFirst({
      where: { deviseId: devise.id },
      orderBy: { date: 'desc' },
    });

    if (!dernierTaux) {
      // Si pas de taux trouvé, utiliser des taux par défaut approximatifs
      return this.getTauxParDefaut(codeDevise);
    }

    return Number(dernierTaux.taux);
  }

  /**
   * Récupère ou crée un taux de change pour une devise
   * Si pas de taux récent, utilise des valeurs par défaut
   */
  async getOuCreerTauxChange(codeDevise: string): Promise<number> {
    if (codeDevise === 'XOF') {
      return 1;
    }

    const devise = await this.prisma.devise.findUnique({
      where: { code: codeDevise },
    });
    if (!devise) {
      throw new NotFoundException(`Devise ${codeDevise} introuvable`);
    }

    // Vérifier s'il y a un taux aujourd'hui
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const demain = new Date(aujourdhui);
    demain.setDate(demain.getDate() + 1);

    const tauxAujourdhui = await this.prisma.tauxChange.findFirst({
      where: {
        deviseId: devise.id,
        date: {
          gte: aujourdhui,
          lt: demain,
        },
      },
    });

    if (tauxAujourdhui) {
      return Number(tauxAujourdhui.taux);
    }

    // Pas de taux aujourd'hui, utiliser le dernier disponible ou créer un taux par défaut
    const dernierTaux = await this.prisma.tauxChange.findFirst({
      where: { deviseId: devise.id },
      orderBy: { date: 'desc' },
    });

    if (dernierTaux) {
      // Utiliser le dernier taux disponible
      return Number(dernierTaux.taux);
    }

    // Créer un taux par défaut pour aujourd'hui
    const tauxParDefaut = this.getTauxParDefaut(codeDevise);
    await this.prisma.tauxChange.create({
      data: {
        deviseId: devise.id,
        deviseBase: 'XOF',
        taux: tauxParDefaut,
        date: aujourdhui,
        source: 'MANUEL',
      },
    });

    return tauxParDefaut;
  }

  /**
   * Met à jour les taux de change depuis une source externe
   * Pour l'instant, utilise des taux fixes (à remplacer par API BCEAO ou autre)
   */
  async mettreAJourTauxChange(codeDevise: string, taux: number, source: string = 'MANUEL'): Promise<void> {
    const devise = await this.prisma.devise.findUnique({
      where: { code: codeDevise },
    });
    if (!devise) {
      throw new NotFoundException(`Devise ${codeDevise} introuvable`);
    }

    if (codeDevise === 'XOF') {
      return; // XOF est la devise de base
    }

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    // Vérifier si un taux existe déjà aujourd'hui
    const tauxExistant = await this.prisma.tauxChange.findFirst({
      where: {
        deviseId: devise.id,
        date: {
          gte: aujourdhui,
        },
      },
    });

    if (tauxExistant) {
      // Mettre à jour le taux existant
      await this.prisma.tauxChange.update({
        where: { id: tauxExistant.id },
        data: {
          taux,
          source,
          updatedAt: new Date(),
        },
      });
    } else {
      // Créer un nouveau taux
      await this.prisma.tauxChange.create({
        data: {
          deviseId: devise.id,
          deviseBase: 'XOF',
          taux,
          date: aujourdhui,
          source,
        },
      });
    }
  }

  /**
   * Convertit un montant d'une devise vers XOF
   */
  async convertirVersXOF(montant: number, codeDevise: string): Promise<number> {
    if (codeDevise === 'XOF') {
      return montant;
    }

    const taux = await this.getOuCreerTauxChange(codeDevise);
    return montant * taux;
  }

  /**
   * Convertit un montant de XOF vers une autre devise
   */
  async convertirDeXOF(montant: number, codeDeviseCible: string): Promise<number> {
    if (codeDeviseCible === 'XOF') {
      return montant;
    }

    const taux = await this.getOuCreerTauxChange(codeDeviseCible);
    return montant / taux;
  }

  /**
   * Convertit un montant d'une devise vers une autre
   */
  async convertir(montant: number, deviseSource: string, deviseCible: string): Promise<number> {
    if (deviseSource === deviseCible) {
      return montant;
    }

    // Convertir d'abord vers XOF, puis vers la devise cible
    const montantXOF = await this.convertirVersXOF(montant, deviseSource);
    return this.convertirDeXOF(montantXOF, deviseCible);
  }

  /**
   * Récupère l'historique des taux de change pour une devise
   */
  async getHistoriqueTaux(codeDevise: string, jours: number = 30): Promise<TauxChangeDto[]> {
    const devise = await this.prisma.devise.findUnique({
      where: { code: codeDevise },
    });
    if (!devise) {
      throw new NotFoundException(`Devise ${codeDevise} introuvable`);
    }

    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - jours);

    const taux = await this.prisma.tauxChange.findMany({
      where: {
        deviseId: devise.id,
        date: { gte: dateLimite },
      },
      orderBy: { date: 'desc' },
    });

    return taux.map((t) => ({
      id: t.id,
      deviseId: t.deviseId,
      deviseBase: t.deviseBase,
      taux: Number(t.taux),
      date: t.date,
      source: t.source,
    }));
  }

  /**
   * Taux par défaut approximatifs (à remplacer par API réelle)
   */
  private getTauxParDefaut(codeDevise: string): number {
    const tauxParDefaut: Record<string, number> = {
      EUR: 655.957, // 1 EUR ≈ 656 XOF (approximatif)
      USD: 600.0,   // 1 USD ≈ 600 XOF (approximatif)
    };
    return tauxParDefaut[codeDevise] || 1;
  }

  private mapToDto(d: any): DeviseDto {
    return {
      id: d.id,
      code: d.code,
      nom: d.nom,
      symbole: d.symbole,
      estParDefaut: d.estParDefaut,
      actif: d.actif,
    };
  }
}
