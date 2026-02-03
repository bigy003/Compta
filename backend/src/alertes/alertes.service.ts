import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface AlerteDto {
  id: string;
  societeId: string;
  userId?: string;
  type: string;
  titre: string;
  message: string;
  severite: string;
  statut: string;
  dateAlerte: Date;
  dateLecture?: Date;
  dateResolution?: Date;
  lien?: string;
  elementId?: string;
  elementType?: string;
  metadata?: any;
}

@Injectable()
export class AlertesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Génère automatiquement toutes les alertes pour une société
   * Analyse les données et crée des alertes proactives
   */
  async genererAlertes(societeId: string): Promise<void> {
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
      include: { owner: true },
    });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    // 1. Alertes basées sur les contrôles d'audit (sévérité HAUTE uniquement)
    await this.genererAlertesDepuisAudit(societeId);

    // 2. Alertes échéances fiscales (7 jours, 3 jours, jour J, retard)
    await this.genererAlertesEcheancesFiscales(societeId);

    // 3. Alertes trésorerie (découvert, solde faible)
    await this.genererAlertesTresorerie(societeId);

    // 4. Alertes factures impayées critiques
    await this.genererAlertesFacturesImpayees(societeId);

    // 5. Alertes anomalies critiques
    await this.genererAlertesAnomaliesCritiques(societeId);
  }

  /**
   * Génère des alertes depuis les contrôles d'audit (sévérité HAUTE uniquement)
   */
  private async genererAlertesDepuisAudit(societeId: string): Promise<void> {
    const controles = await this.auditService.executerControles(societeId);
    const controlesHaute = controles.filter((c) => c.severite === 'HAUTE');

    for (const controle of controlesHaute) {
      // Vérifier si une alerte existe déjà pour ce contrôle
      const alerteExistante = await this.prisma.alerte.findFirst({
        where: {
          societeId,
          type: controle.type,
          elementId: controle.metadata?.factureId || controle.metadata?.rapprochementId || controle.metadata?.transactionIds?.[0],
          statut: { in: ['NON_LUE', 'LUE'] },
        },
      });

      if (!alerteExistante) {
        await this.prisma.alerte.create({
          data: {
            societeId,
            type: controle.type,
            titre: controle.titre,
            message: controle.description,
            severite: controle.severite,
            statut: 'NON_LUE',
            lien: controle.lien,
            elementId: controle.metadata?.factureId || controle.metadata?.rapprochementId || controle.metadata?.transactionIds?.[0],
            elementType: this.getElementTypeFromControleType(controle.type),
            metadata: controle.metadata,
          },
        });
      }
    }
  }

  /**
   * Génère des alertes pour les échéances fiscales proches
   */
  private async genererAlertesEcheancesFiscales(societeId: string): Promise<void> {
    const maintenant = new Date();
    const dans7Jours = new Date(maintenant.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dans3Jours = new Date(maintenant.getTime() + 3 * 24 * 60 * 60 * 1000);
    const demain = new Date(maintenant.getTime() + 24 * 60 * 60 * 1000);

    const echeances = await this.prisma.echeanceFiscale.findMany({
      where: {
        societeId,
        statut: { in: ['A_FAIRE', 'EN_COURS'] },
        dateEcheance: { lte: dans7Jours, gte: maintenant },
      },
    });

    for (const echeance of echeances) {
      const joursRestants = Math.ceil(
        (echeance.dateEcheance.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24),
      );

      let severite = 'MOYENNE';
      let message = '';
      if (joursRestants <= 0) {
        severite = 'HAUTE';
        message = `⚠️ URGENT : L'échéance "${echeance.libelle}" est en retard !`;
      } else if (joursRestants === 1) {
        severite = 'HAUTE';
        message = `⚠️ L'échéance "${echeance.libelle}" est pour demain !`;
      } else if (joursRestants <= 3) {
        severite = 'HAUTE';
        message = `L'échéance "${echeance.libelle}" est dans ${joursRestants} jours`;
      } else {
        message = `L'échéance "${echeance.libelle}" est dans ${joursRestants} jours`;
      }

      // Vérifier si alerte existe déjà
      const alerteExistante = await this.prisma.alerte.findFirst({
        where: {
          societeId,
          type: 'ECHEANCE_FISCALE',
          elementId: echeance.id,
          statut: { in: ['NON_LUE', 'LUE'] },
        },
      });

      if (!alerteExistante) {
        await this.prisma.alerte.create({
          data: {
            societeId,
            type: 'ECHEANCE_FISCALE',
            titre: `Échéance fiscale : ${echeance.libelle}`,
            message,
            severite,
            statut: 'NON_LUE',
            lien: '/calendrier-fiscal',
            elementId: echeance.id,
            elementType: 'ECHEANCE_FISCALE',
            metadata: {
              echeanceId: echeance.id,
              dateEcheance: echeance.dateEcheance,
              joursRestants,
              montantEstime: echeance.montantEstime ? Number(echeance.montantEstime) : null,
            },
          },
        });
      }
    }
  }

  /**
   * Génère des alertes trésorerie (découvert, solde faible)
   */
  private async genererAlertesTresorerie(societeId: string): Promise<void> {
    const comptesBancaires = await this.prisma.compteBancaire.findMany({
      where: { societeId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    for (const compte of comptesBancaires) {
      let solde = Number(compte.soldeInitial || 0);
      for (const transaction of compte.transactions) {
        solde += Number(transaction.montant);
      }

      // Alerte découvert
      if (solde < 0) {
        const alertesExistantes = await this.prisma.alerte.findMany({
          where: {
            societeId,
            type: 'ALERTE_TRESORERIE',
            elementId: compte.id,
            statut: { in: ['NON_LUE', 'LUE'] },
          },
        });
        const alerteExistante = alertesExistantes.find(
          (a) => (a.metadata as any)?.type === 'DECOUVERT',
        );

        if (!alerteExistante) {
          await this.prisma.alerte.create({
            data: {
              societeId,
              type: 'ALERTE_TRESORERIE',
              titre: `⚠️ Compte "${compte.nom}" en découvert`,
              message: `Le compte bancaire "${compte.nom}" présente un solde négatif de ${Math.abs(solde).toLocaleString('fr-FR')} FCFA`,
              severite: 'HAUTE',
              statut: 'NON_LUE',
              lien: '/comptes-bancaires',
              elementId: compte.id,
              elementType: 'COMPTE_BANCAIRE',
              metadata: {
                compteBancaireId: compte.id,
                compteNom: compte.nom,
                solde,
                type: 'DECOUVERT',
              },
            },
          });
        }
      }

      // Alerte solde faible (< 100 000 FCFA)
      if (solde >= 0 && solde < 100000) {
        const alertesExistantes = await this.prisma.alerte.findMany({
          where: {
            societeId,
            type: 'ALERTE_TRESORERIE',
            elementId: compte.id,
            statut: { in: ['NON_LUE', 'LUE'] },
          },
        });
        const alerteExistante = alertesExistantes.find(
          (a) => (a.metadata as any)?.type === 'SOLDE_FAIBLE',
        );

        if (!alerteExistante) {
          await this.prisma.alerte.create({
            data: {
              societeId,
              type: 'ALERTE_TRESORERIE',
              titre: `Solde faible sur le compte "${compte.nom}"`,
              message: `Le compte "${compte.nom}" présente un solde faible de ${solde.toLocaleString('fr-FR')} FCFA`,
              severite: 'MOYENNE',
              statut: 'NON_LUE',
              lien: '/comptes-bancaires',
              elementId: compte.id,
              elementType: 'COMPTE_BANCAIRE',
              metadata: {
                compteBancaireId: compte.id,
                compteNom: compte.nom,
                solde,
                type: 'SOLDE_FAIBLE',
              },
            },
          });
        }
      }
    }
  }

  /**
   * Génère des alertes pour factures impayées critiques (> 60 jours)
   */
  private async genererAlertesFacturesImpayees(societeId: string): Promise<void> {
    const maintenant = new Date();
    const seuilJours = 60;

    const factures = await this.prisma.facture.findMany({
      where: {
        societeId,
        statut: { in: ['ENVOYEE', 'BROUILLON'] },
      },
      include: {
        client: true,
        paiements: true,
      },
    });

    for (const facture of factures) {
      const totalPaye = facture.paiements.reduce((sum, p) => sum + Number(p.montant), 0);
      const resteAPayer = Number(facture.totalTTC) - totalPaye;

      if (resteAPayer > 0) {
        const joursDepuisEmission = Math.floor(
          (maintenant.getTime() - facture.date.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (joursDepuisEmission > seuilJours) {
          const alerteExistante = await this.prisma.alerte.findFirst({
            where: {
              societeId,
              type: 'FACTURE_IMPAYEE_CRITIQUE',
              elementId: facture.id,
              statut: { in: ['NON_LUE', 'LUE'] },
            },
          });

          if (!alerteExistante) {
            await this.prisma.alerte.create({
              data: {
                societeId,
                type: 'FACTURE_IMPAYEE_CRITIQUE',
                titre: `Facture ${facture.numero} impayée depuis ${joursDepuisEmission} jours`,
                message: `La facture ${facture.numero} de ${Number(facture.totalTTC).toLocaleString('fr-FR')} FCFA envoyée à ${facture.client.nom} le ${facture.date.toLocaleDateString('fr-FR')} n'est toujours pas payée. Reste à payer: ${resteAPayer.toLocaleString('fr-FR')} FCFA`,
                severite: 'HAUTE',
                statut: 'NON_LUE',
                lien: `/factures/${facture.id}`,
                elementId: facture.id,
                elementType: 'FACTURE',
                metadata: {
                  factureId: facture.id,
                  numero: facture.numero,
                  clientId: facture.clientId,
                  clientNom: facture.client.nom,
                  montantTotal: Number(facture.totalTTC),
                  resteAPayer,
                  joursDepuisEmission,
                },
              },
            });
          }
        }
      }
    }
  }

  /**
   * Génère des alertes pour anomalies critiques
   */
  private async genererAlertesAnomaliesCritiques(societeId: string): Promise<void> {
    const controles = await this.auditService.executerControles(societeId);
    const anomaliesCritiques = controles.filter(
      (c) =>
        c.type === 'ANOMALIE_MONTANT' ||
        c.type === 'COMPTE_ERRONE' ||
        (c.type === 'DATE_SUSPECTE' && c.severite === 'HAUTE'),
    );

    for (const controle of anomaliesCritiques) {
      const alerteExistante = await this.prisma.alerte.findFirst({
        where: {
          societeId,
          type: `ANOMALIE_${controle.type}`,
          elementId: controle.metadata?.factureId || controle.metadata?.ecritureId,
          statut: { in: ['NON_LUE', 'LUE'] },
        },
      });

      if (!alerteExistante && controle.severite === 'HAUTE') {
        await this.prisma.alerte.create({
          data: {
            societeId,
            type: `ANOMALIE_${controle.type}`,
            titre: `⚠️ ${controle.titre}`,
            message: controle.description,
            severite: 'HAUTE',
            statut: 'NON_LUE',
            lien: controle.lien,
            elementId: controle.metadata?.factureId || controle.metadata?.ecritureId,
            elementType: controle.metadata?.factureId ? 'FACTURE' : 'ECRITURE',
            metadata: controle.metadata,
          },
        });
      }
    }
  }

  /**
   * Récupère toutes les alertes pour une société ou un utilisateur
   */
  async getAlertes(
    societeId: string,
    userId?: string,
    filters?: {
      statut?: string;
      type?: string;
      severite?: string;
      nonLuesSeulement?: boolean;
    },
  ): Promise<AlerteDto[]> {
    const where: any = { societeId };
    if (userId) {
      where.OR = [{ userId }, { userId: null }]; // Alertes pour l'utilisateur ou pour tous
    }
    if (filters?.statut) where.statut = filters.statut;
    if (filters?.type) where.type = filters.type;
    if (filters?.severite) where.severite = filters.severite;
    if (filters?.nonLuesSeulement) where.statut = 'NON_LUE';

    const alertes = await this.prisma.alerte.findMany({
      where,
      orderBy: [
        { severite: 'desc' }, // HAUTE en premier
        { dateAlerte: 'desc' },
      ],
      take: 100, // Limiter à 100 dernières alertes
    });

    return alertes.map(this.mapToDto);
  }

  /**
   * Récupère le nombre d'alertes non lues
   */
  async getNombreAlertesNonLues(societeId: string, userId?: string): Promise<number> {
    const where: any = {
      societeId,
      statut: 'NON_LUE',
    };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    return this.prisma.alerte.count({ where });
  }

  /**
   * Marque une alerte comme lue
   */
  async marquerCommeLue(societeId: string, alerteId: string, userId?: string): Promise<void> {
    const where: any = { id: alerteId, societeId };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    await this.prisma.alerte.updateMany({
      where,
      data: {
        statut: 'LUE',
        dateLecture: new Date(),
      },
    });
  }

  /**
   * Marque une alerte comme ignorée
   */
  async ignorer(societeId: string, alerteId: string, userId?: string): Promise<void> {
    const where: any = { id: alerteId, societeId };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    await this.prisma.alerte.updateMany({
      where,
      data: {
        statut: 'IGNOREE',
        dateLecture: new Date(),
      },
    });
  }

  /**
   * Marque une alerte comme résolue
   */
  async resoudre(societeId: string, alerteId: string, userId?: string): Promise<void> {
    const where: any = { id: alerteId, societeId };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    await this.prisma.alerte.updateMany({
      where,
      data: {
        statut: 'RESOLUE',
        dateResolution: new Date(),
      },
    });
  }

  /**
   * Marque toutes les alertes comme lues
   */
  async marquerToutesCommeLues(societeId: string, userId?: string): Promise<void> {
    const where: any = {
      societeId,
      statut: 'NON_LUE',
    };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    await this.prisma.alerte.updateMany({
      where,
      data: {
        statut: 'LUE',
        dateLecture: new Date(),
      },
    });
  }

  private getElementTypeFromControleType(type: string): string {
    const mapping: Record<string, string> = {
      FACTURE_NON_PAYEE: 'FACTURE',
      RAPPROCHEMENT_A_VALIDER: 'RAPPROCHEMENT',
      DOCUMENT_MANQUANT: 'DOCUMENT',
      DOUBLON_DETECTE: 'TRANSACTION',
      ANOMALIE_MONTANT: 'FACTURE',
      DATE_SUSPECTE: 'FACTURE',
      INCOHERENCE_COMPTABILITE: 'ECRITURE',
      COMPTE_ERRONE: 'ECRITURE',
      ALERTE_TRESORERIE: 'COMPTE_BANCAIRE',
    };
    return mapping[type] || 'AUTRE';
  }

  private mapToDto(a: any): AlerteDto {
    return {
      id: a.id,
      societeId: a.societeId,
      userId: a.userId,
      type: a.type,
      titre: a.titre,
      message: a.message,
      severite: a.severite,
      statut: a.statut,
      dateAlerte: a.dateAlerte,
      dateLecture: a.dateLecture,
      dateResolution: a.dateResolution,
      lien: a.lien,
      elementId: a.elementId,
      elementType: a.elementType,
      metadata: a.metadata,
    };
  }
}
