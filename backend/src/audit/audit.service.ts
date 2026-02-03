import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

export interface ControleAudit {
  type: 
    | 'FACTURE_NON_PAYEE' 
    | 'RAPPROCHEMENT_A_VALIDER' 
    | 'DOCUMENT_MANQUANT' 
    | 'DOUBLON_DETECTE'
    | 'ANOMALIE_MONTANT'
    | 'DATE_SUSPECTE'
    | 'INCOHERENCE_COMPTABILITE'
    | 'COMPTE_ERRONE'
    | 'ALERTE_TRESORERIE';
  severite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  titre: string;
  description: string;
  dateDetection: Date;
  lien?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Exécute tous les contrôles d'audit pour une société
   */
  async executerControles(societeId: string): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];

    // 1. Factures non payées
    const facturesNonPayees = await this.controleFacturesNonPayees(societeId);
    controles.push(...facturesNonPayees);

    // 2. Rapprochements à valider
    const rapprochementsAValider = await this.controleRapprochementsAValider(societeId);
    controles.push(...rapprochementsAValider);

    // 3. Documents manquants
    const documentsManquants = await this.controleDocumentsManquants(societeId);
    controles.push(...documentsManquants);

    // 4. Doublons détectés
    const doublons = await this.controleDoublons(societeId);
    controles.push(...doublons);

    // 5. Anomalies de montants
    const anomaliesMontants = await this.controleAnomaliesMontants(societeId);
    controles.push(...anomaliesMontants);

    // 6. Dates suspectes
    const datesSuspectes = await this.controleDatesSuspectes(societeId);
    controles.push(...datesSuspectes);

    // 7. Incohérences comptables
    const incoherences = await this.controleIncoherencesComptables(societeId);
    controles.push(...incoherences);

    // 8. Comptes erronés
    const comptesErrones = await this.controleComptesErrones(societeId);
    controles.push(...comptesErrones);

    // 9. Alertes trésorerie
    const alertesTresorerie = await this.controleAlertesTresorerie(societeId);
    controles.push(...alertesTresorerie);

    // Trier par sévérité (HAUTE > MOYENNE > BASSE) puis par date
    return controles.sort((a, b) => {
      const severiteOrder = { HAUTE: 3, MOYENNE: 2, BASSE: 1 };
      const diff = severiteOrder[b.severite] - severiteOrder[a.severite];
      if (diff !== 0) return diff;
      return b.dateDetection.getTime() - a.dateDetection.getTime();
    });
  }

  /**
   * Contrôle 1: Factures non payées (envoyées depuis plus de X jours)
   */
  private async controleFacturesNonPayees(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();
    const seuilJours = 30; // Factures non payées depuis plus de 30 jours

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
      const totalPaye = facture.paiements.reduce(
        (sum, p) => sum + Number(p.montant),
        0,
      );
      const resteAPayer = Number(facture.totalTTC) - totalPaye;

      if (resteAPayer > 0) {
        const joursDepuisEmission = Math.floor(
          (maintenant.getTime() - facture.date.getTime()) / (1000 * 60 * 60 * 24),
        );

        let severite: 'HAUTE' | 'MOYENNE' | 'BASSE' = 'BASSE';
        if (joursDepuisEmission > 60) {
          severite = 'HAUTE';
        } else if (joursDepuisEmission > 30) {
          severite = 'MOYENNE';
        }

        controles.push({
          type: 'FACTURE_NON_PAYEE',
          severite,
          titre: `Facture ${facture.numero} non payée`,
          description: `Facture de ${Number(facture.totalTTC).toLocaleString('fr-FR')} FCFA envoyée le ${facture.date.toLocaleDateString('fr-FR')} à ${facture.client.nom}. Reste à payer: ${resteAPayer.toLocaleString('fr-FR')} FCFA (${joursDepuisEmission} jours)`,
          dateDetection: maintenant,
          lien: `/factures/${facture.id}`,
          metadata: {
            factureId: facture.id,
            numero: facture.numero,
            clientId: facture.clientId,
            clientNom: facture.client.nom,
            montantTotal: Number(facture.totalTTC),
            resteAPayer,
            joursDepuisEmission,
          },
        });
      }
    }

    return controles;
  }

  /**
   * Contrôle 2: Rapprochements en attente de validation
   */
  private async controleRapprochementsAValider(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();

    const rapprochements = await this.prisma.rapprochementFacture.findMany({
      where: {
        societeId,
        statut: 'PENDING',
      },
      include: {
        facture: {
          include: { client: true },
        },
        transactionBancaire: {
          include: { compteBancaire: true },
        },
      },
      orderBy: { dateRapprochement: 'asc' },
    });

    for (const rapprochement of rapprochements) {
      const joursDepuisCreation = Math.floor(
        (maintenant.getTime() - rapprochement.dateRapprochement.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      let severite: 'HAUTE' | 'MOYENNE' | 'BASSE' = 'BASSE';
      if (joursDepuisCreation > 7) {
        severite = 'HAUTE';
      } else if (joursDepuisCreation > 3) {
        severite = 'MOYENNE';
      }

      controles.push({
        type: 'RAPPROCHEMENT_A_VALIDER',
        severite,
        titre: `Rapprochement à valider - Facture ${rapprochement.facture.numero}`,
        description: `Rapprochement créé le ${rapprochement.dateRapprochement.toLocaleDateString('fr-FR')} pour la facture ${rapprochement.facture.numero} (${rapprochement.facture.client.nom}). Montant: ${Number(rapprochement.montant).toLocaleString('fr-FR')} FCFA (${joursDepuisCreation} jours en attente)`,
        dateDetection: maintenant,
        lien: `/rapprochement-avance`,
        metadata: {
          rapprochementId: rapprochement.id,
          factureId: rapprochement.factureId,
          factureNumero: rapprochement.facture.numero,
          montant: Number(rapprochement.montant),
          joursDepuisCreation,
        },
      });
    }

    return controles;
  }

  /**
   * Contrôle 3: Documents manquants
   */
  private async controleDocumentsManquants(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();

    // Notes de frais sans justificatif
    const notesFraisSansJustificatif = await this.prisma.noteFrais.findMany({
      where: {
        societeId,
        statut: { in: ['BROUILLON', 'EN_ATTENTE', 'VALIDEE'] },
        justificatifUrl: null,
      },
    });

    for (const note of notesFraisSansJustificatif) {
      controles.push({
        type: 'DOCUMENT_MANQUANT',
        severite: 'MOYENNE',
        titre: `Note de frais sans justificatif`,
        description: `Note de frais du ${note.date.toLocaleDateString('fr-FR')} d'un montant de ${Number(note.montant).toLocaleString('fr-FR')} FCFA (${note.categorie || 'Non catégorisé'}) n'a pas de justificatif`,
        dateDetection: maintenant,
        lien: `/notes-frais`,
        metadata: {
          noteFraisId: note.id,
          montant: Number(note.montant),
          categorie: note.categorie,
          date: note.date,
        },
      });
    }

    // Factures fournisseurs sans document associé (si applicable)
    // On pourrait vérifier les dépenses sans facture fournisseur uploadée
    const depensesSansDocument = await this.prisma.depense.findMany({
      where: {
        societeId,
      },
      include: {
        transactionBancaire: true,
      },
    });

    // Vérifier si des dépenses importantes n'ont pas de document associé
    for (const depense of depensesSansDocument) {
      const montant = Number(depense.montant);
      if (montant > 100000) {
        // Dépense > 100 000 FCFA
        const documentsAssocies = await this.prisma.document.findMany({
          where: {
            societeId,
            type: 'FACTURE_FOURNISSEUR',
            dateUpload: {
              gte: new Date(depense.date.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 jours avant
              lte: new Date(depense.date.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 jours après
            },
          },
        });

        // Vérifier si un document correspond approximativement au montant
        const documentCorrespondant = documentsAssocies.find((doc) => {
          // On ne peut pas vérifier le montant dans le document sans OCR, donc on vérifie juste la date
          return true;
        });

        if (documentsAssocies.length === 0) {
          controles.push({
            type: 'DOCUMENT_MANQUANT',
            severite: 'MOYENNE',
            titre: `Dépense importante sans facture fournisseur`,
            description: `Dépense du ${depense.date.toLocaleDateString('fr-FR')} d'un montant de ${montant.toLocaleString('fr-FR')} FCFA n'a pas de facture fournisseur associée`,
            dateDetection: maintenant,
            lien: `/depenses`,
            metadata: {
              depenseId: depense.id,
              montant,
              date: depense.date,
            },
          });
        }
      }
    }

    return controles;
  }

  /**
   * Contrôle 4: Doublons détectés (transactions bancaires similaires)
   */
  private async controleDoublons(societeId: string): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();

    // Récupérer toutes les transactions bancaires
    const transactions = await this.prisma.transactionBancaire.findMany({
      where: {
        compteBancaire: { societeId },
      },
      include: {
        compteBancaire: true,
      },
      orderBy: { date: 'desc' },
    });

    // Grouper par montant et date proche (même jour)
    const groupes = new Map<string, typeof transactions>();
    for (const transaction of transactions) {
      const montant = Number(transaction.montant).toFixed(2);
      const dateStr = transaction.date.toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `${montant}-${dateStr}`;

      if (!groupes.has(key)) {
        groupes.set(key, []);
      }
      groupes.get(key)!.push(transaction);
    }

    // Identifier les groupes avec plusieurs transactions (doublons potentiels)
    for (const [key, groupeTransactions] of groupes.entries()) {
      if (groupeTransactions.length > 1) {
        // Vérifier si ce sont vraiment des doublons (même libellé ou très similaire)
        const libelles = groupeTransactions.map((t) =>
          t.libelle.toLowerCase().trim(),
        );
        const libellesUniques = new Set(libelles);

        // Si tous les libellés sont identiques ou très similaires, c'est probablement un doublon
        if (libellesUniques.size <= 1 || groupeTransactions.length > 2) {
          const montant = Number(groupeTransactions[0].montant);
          controles.push({
            type: 'DOUBLON_DETECTE',
            severite: 'MOYENNE',
            titre: `${groupeTransactions.length} transactions similaires détectées`,
            description: `${groupeTransactions.length} transactions de ${montant.toLocaleString('fr-FR')} FCFA le ${groupeTransactions[0].date.toLocaleDateString('fr-FR')} sur le compte ${groupeTransactions[0].compteBancaire.nom}. Libellé: "${groupeTransactions[0].libelle}"`,
            dateDetection: maintenant,
            lien: `/tresorerie`,
            metadata: {
              transactionIds: groupeTransactions.map((t) => t.id),
              montant,
              date: groupeTransactions[0].date,
              compteBancaireId: groupeTransactions[0].compteBancaireId,
              compteBancaireNom: groupeTransactions[0].compteBancaire.nom,
              nombreDoublons: groupeTransactions.length,
            },
          });
        }
      }
    }

    return controles;
  }

  /**
   * Récupère un résumé des contrôles par type
   */
  async getResumeControles(societeId: string) {
    const controles = await this.executerControles(societeId);

    const resume = {
      total: controles.length,
      parType: {
        FACTURE_NON_PAYEE: 0,
        RAPPROCHEMENT_A_VALIDER: 0,
        DOCUMENT_MANQUANT: 0,
        DOUBLON_DETECTE: 0,
        ANOMALIE_MONTANT: 0,
        DATE_SUSPECTE: 0,
        INCOHERENCE_COMPTABILITE: 0,
        COMPTE_ERRONE: 0,
        ALERTE_TRESORERIE: 0,
      },
      parSeverite: {
        HAUTE: 0,
        MOYENNE: 0,
        BASSE: 0,
      },
    };

    for (const controle of controles) {
      if (resume.parType[controle.type] !== undefined) {
        resume.parType[controle.type]++;
      }
      resume.parSeverite[controle.severite]++;
    }

    return {
      resume,
      controles,
    };
  }

  /**
   * Génère un rapport d'audit en PDF pour une société
   */
  async generateRapportPdfBuffer(societeId: string): Promise<Buffer> {
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
    });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    const result = await this.getResumeControles(societeId);
    const { resume, controles } = result;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const margin = 50;
      let y = margin;

      // Titre
      doc.fontSize(18).font('Helvetica-Bold').text(`Rapport d'audit - ${societe.nom}`, margin, y);
      y += 28;

      doc.fontSize(10).font('Helvetica').text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, margin, y);
      y += 24;

      // Résumé
      doc.fontSize(14).font('Helvetica-Bold').text('Résumé des contrôles', margin, y);
      y += 22;

      doc.fontSize(10).font('Helvetica');
      doc.text(`Total : ${resume.total} point(s) de contrôle`, margin, y);
      y += 18;
      doc.text(`Par sévérité - Haute : ${resume.parSeverite.HAUTE} | Moyenne : ${resume.parSeverite.MOYENNE} | Basse : ${resume.parSeverite.BASSE}`, margin, y);
      y += 18;
      doc.text(`Par type:`, margin, y);
      y += 16;
      doc.text(`- Factures non payées: ${resume.parType.FACTURE_NON_PAYEE}`, margin + 10, y);
      y += 14;
      doc.text(`- Rapprochements à valider: ${resume.parType.RAPPROCHEMENT_A_VALIDER}`, margin + 10, y);
      y += 14;
      doc.text(`- Documents manquants: ${resume.parType.DOCUMENT_MANQUANT}`, margin + 10, y);
      y += 14;
      doc.text(`- Doublons: ${resume.parType.DOUBLON_DETECTE}`, margin + 10, y);
      y += 14;
      doc.text(`- Anomalies montants: ${resume.parType.ANOMALIE_MONTANT}`, margin + 10, y);
      y += 14;
      doc.text(`- Dates suspectes: ${resume.parType.DATE_SUSPECTE}`, margin + 10, y);
      y += 14;
      doc.text(`- Incohérences comptables: ${resume.parType.INCOHERENCE_COMPTABILITE}`, margin + 10, y);
      y += 14;
      doc.text(`- Comptes erronés: ${resume.parType.COMPTE_ERRONE}`, margin + 10, y);
      y += 14;
      doc.text(`- Alertes trésorerie: ${resume.parType.ALERTE_TRESORERIE}`, margin + 10, y);
      y += 28;

      // Liste des contrôles
      doc.fontSize(14).font('Helvetica-Bold').text('Détail des contrôles', margin, y);
      y += 22;

      const typeLabels: Record<string, string> = {
        FACTURE_NON_PAYEE: 'Facture non payée',
        RAPPROCHEMENT_A_VALIDER: 'Rapprochement à valider',
        DOCUMENT_MANQUANT: 'Document manquant',
        DOUBLON_DETECTE: 'Doublon détecté',
        ANOMALIE_MONTANT: 'Anomalie de montant',
        DATE_SUSPECTE: 'Date suspecte',
        INCOHERENCE_COMPTABILITE: 'Incohérence comptable',
        COMPTE_ERRONE: 'Compte erroné',
        ALERTE_TRESORERIE: 'Alerte trésorerie',
      };

      for (const c of controles) {
        if (y > 700) {
          doc.addPage();
          y = margin;
        }
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937').text(`${c.titre} [${c.severite}]`, margin, y);
        y += 16;
        doc.fontSize(9).font('Helvetica').fillColor('#4b5563').text(`Type : ${typeLabels[c.type] || c.type}`, margin, y);
        y += 14;
        doc.font('Helvetica').fillColor('#374151').text(c.description, margin, y, { width: 500 });
        y = (doc as any).y + 16;
      }

      doc.end();
    });
  }

  /**
   * Contrôle 5: Anomalies de montants (montants inhabituels par rapport à l'historique)
   */
  private async controleAnomaliesMontants(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();

    // Analyser les factures : détecter celles avec des montants anormalement élevés
    const factures = await this.prisma.facture.findMany({
      where: { societeId },
      orderBy: { date: 'desc' },
      take: 100, // Dernières 100 factures
    });

    if (factures.length < 3) return controles; // Pas assez de données

    // Calculer la moyenne et l'écart-type des montants
    const montants = factures.map((f) => Number(f.totalTTC));
    const moyenne = montants.reduce((a, b) => a + b, 0) / montants.length;
    const variance = montants.reduce((sum, m) => sum + Math.pow(m - moyenne, 2), 0) / montants.length;
    const ecartType = Math.sqrt(variance);
    const seuilAnormal = moyenne + (3 * ecartType); // 3 écarts-types = anomalie

    // Vérifier les factures récentes (30 derniers jours)
    const dateLimite = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const facture of factures) {
      if (facture.date >= dateLimite) {
        const montant = Number(facture.totalTTC);
        if (montant > seuilAnormal && montant > moyenne * 2) {
          // Facture au moins 2x plus élevée que la moyenne
          controles.push({
            type: 'ANOMALIE_MONTANT',
            severite: montant > moyenne * 5 ? 'HAUTE' : 'MOYENNE',
            titre: `Facture ${facture.numero} avec montant inhabituel`,
            description: `Facture de ${montant.toLocaleString('fr-FR')} FCFA (moyenne: ${Math.round(moyenne).toLocaleString('fr-FR')} FCFA). Montant ${((montant / moyenne - 1) * 100).toFixed(0)}% supérieur à la moyenne.`,
            dateDetection: maintenant,
            lien: `/factures/${facture.id}`,
            metadata: {
              factureId: facture.id,
              numero: facture.numero,
              montant,
              moyenne,
              ecartPourcentage: ((montant / moyenne - 1) * 100),
            },
          });
        }
      }
    }

    // Analyser les dépenses
    const depenses = await this.prisma.depense.findMany({
      where: { societeId },
      orderBy: { date: 'desc' },
      take: 100,
    });

    if (depenses.length >= 3) {
      const montantsDepenses = depenses.map((d) => Number(d.montant));
      const moyenneDepenses = montantsDepenses.reduce((a, b) => a + b, 0) / montantsDepenses.length;
      const seuilDepenseAnormal = moyenneDepenses * 3;

      for (const depense of depenses) {
        if (depense.date >= dateLimite) {
          const montant = Number(depense.montant);
          if (montant > seuilDepenseAnormal) {
            controles.push({
              type: 'ANOMALIE_MONTANT',
              severite: 'MOYENNE',
              titre: `Dépense avec montant inhabituel`,
              description: `Dépense du ${depense.date.toLocaleDateString('fr-FR')} de ${montant.toLocaleString('fr-FR')} FCFA (moyenne: ${Math.round(moyenneDepenses).toLocaleString('fr-FR')} FCFA)`,
              dateDetection: maintenant,
              lien: `/tresorerie`,
              metadata: {
                depenseId: depense.id,
                montant,
                moyenne: moyenneDepenses,
              },
            });
          }
        }
      }
    }

    return controles;
  }

  /**
   * Contrôle 6: Dates suspectes (futur, rétroactif)
   */
  private async controleDatesSuspectes(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();
    const demain = new Date(maintenant.getTime() + 24 * 60 * 60 * 1000);

    // Factures datées dans le futur
    const facturesFutures = await this.prisma.facture.findMany({
      where: {
        societeId,
        date: { gt: maintenant },
      },
      include: { client: true },
    });

    for (const facture of facturesFutures) {
      const joursDansFutur = Math.ceil(
        (facture.date.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24),
      );
      controles.push({
        type: 'DATE_SUSPECTE',
        severite: joursDansFutur > 30 ? 'HAUTE' : 'MOYENNE',
        titre: `Facture ${facture.numero} datée dans le futur`,
        description: `Facture datée du ${facture.date.toLocaleDateString('fr-FR')} (${joursDansFutur} jours dans le futur). Date actuelle: ${maintenant.toLocaleDateString('fr-FR')}`,
        dateDetection: maintenant,
        lien: `/factures/${facture.id}`,
        metadata: {
          factureId: facture.id,
          numero: facture.numero,
          dateFacture: facture.date,
          joursDansFutur,
        },
      });
    }

    // Écritures comptables très rétroactives (> 1 an)
    const unAnAuparavant = new Date(maintenant.getTime() - 365 * 24 * 60 * 60 * 1000);
    const ecrituresRetroactives = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        date: { lt: unAnAuparavant },
        createdAt: { gte: new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000) }, // Créées récemment
      },
    });

    for (const ecriture of ecrituresRetroactives) {
      const joursRetroactifs = Math.ceil(
        (maintenant.getTime() - ecriture.date.getTime()) / (1000 * 60 * 60 * 24),
      );
      controles.push({
        type: 'DATE_SUSPECTE',
        severite: joursRetroactifs > 365 ? 'HAUTE' : 'MOYENNE',
        titre: `Écriture comptable très rétroactive`,
        description: `Écriture créée récemment mais datée du ${ecriture.date.toLocaleDateString('fr-FR')} (${joursRetroactifs} jours dans le passé). Libellé: "${ecriture.libelle}"`,
        dateDetection: maintenant,
        lien: `/plan-comptable`,
        metadata: {
          ecritureId: ecriture.id,
          dateEcriture: ecriture.date,
          joursRetroactifs,
          libelle: ecriture.libelle,
        },
      });
    }

    return controles;
  }

  /**
   * Contrôle 7: Incohérences comptables (analyse de cohérence)
   */
  private async controleIncoherencesComptables(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();

    // Vérifier les écritures avec montant = 0
    const ecrituresZero = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        montant: { equals: 0 },
      },
      take: 20,
    });

    for (const ecriture of ecrituresZero) {
      controles.push({
        type: 'INCOHERENCE_COMPTABILITE',
        severite: 'BASSE',
        titre: `Écriture comptable avec montant zéro`,
        description: `Écriture du ${ecriture.date.toLocaleDateString('fr-FR')} avec montant 0 FCFA. Libellé: "${ecriture.libelle}"`,
        dateDetection: maintenant,
        lien: `/plan-comptable`,
        metadata: {
          ecritureId: ecriture.id,
          libelle: ecriture.libelle,
        },
      });
    }

    // Vérifier les écritures où débit = crédit (peut être normal mais à vérifier)
    // On ne peut pas vérifier ça directement car débit et crédit sont sur des comptes différents
    // Mais on peut vérifier les écritures avec des montants très élevés isolés

    // Vérifier les factures sans écriture comptable associée (si applicable)
    const facturesSansEcriture = await this.prisma.facture.findMany({
      where: {
        societeId,
        date: { gte: new Date(maintenant.getTime() - 90 * 24 * 60 * 60 * 1000) }, // 3 derniers mois
      },
    });

    for (const facture of facturesSansEcriture) {
      const ecrituresAssociees = await this.prisma.ecritureComptable.findMany({
        where: {
          societeId,
          pieceJustificative: { contains: facture.numero },
        },
      });

      if (ecrituresAssociees.length === 0) {
        controles.push({
          type: 'INCOHERENCE_COMPTABILITE',
          severite: 'MOYENNE',
          titre: `Facture ${facture.numero} sans écriture comptable`,
          description: `Facture du ${facture.date.toLocaleDateString('fr-FR')} de ${Number(facture.totalTTC).toLocaleString('fr-FR')} FCFA n'a pas d'écriture comptable associée`,
          dateDetection: maintenant,
          lien: `/factures/${facture.id}`,
          metadata: {
            factureId: facture.id,
            numero: facture.numero,
            montant: Number(facture.totalTTC),
          },
        });
      }
    }

    return controles;
  }

  /**
   * Contrôle 8: Comptes erronés (écritures sur mauvais compte comptable)
   */
  private async controleComptesErrones(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();

    // Récupérer les écritures récentes
    const ecritures = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        date: { gte: new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000) }, // 30 derniers jours
      },
      include: {
        compteDebit: true,
        compteCredit: true,
      },
    });

    // Vérifier les écritures où débit et crédit sont sur le même compte (erreur classique)
    for (const ecriture of ecritures) {
      if (ecriture.compteDebitId === ecriture.compteCreditId) {
        controles.push({
          type: 'COMPTE_ERRONE',
          severite: 'HAUTE',
          titre: `Écriture avec même compte en débit et crédit`,
          description: `Écriture du ${ecriture.date.toLocaleDateString('fr-FR')} : compte ${ecriture.compteDebit.code} (${ecriture.compteDebit.libelle}) utilisé en débit ET crédit. Libellé: "${ecriture.libelle}"`,
          dateDetection: maintenant,
          lien: `/plan-comptable`,
          metadata: {
            ecritureId: ecriture.id,
            compteId: ecriture.compteDebitId,
            compteCode: ecriture.compteDebit.code,
            libelle: ecriture.libelle,
          },
        });
      }

      // Vérifier les écritures sur des comptes de classe 1 (immobilisations) avec de petits montants (suspect)
      if (
        (ecriture.compteDebit.code.startsWith('2') || ecriture.compteCredit.code.startsWith('2')) &&
        Number(ecriture.montant) < 10000
      ) {
        controles.push({
          type: 'COMPTE_ERRONE',
          severite: 'MOYENNE',
          titre: `Écriture suspecte sur compte d'immobilisation`,
          description: `Écriture du ${ecriture.date.toLocaleDateString('fr-FR')} de ${Number(ecriture.montant).toLocaleString('fr-FR')} FCFA sur compte d'immobilisation (classe 2). Vérifier si ce n'est pas une charge (classe 6).`,
          dateDetection: maintenant,
          lien: `/plan-comptable`,
          metadata: {
            ecritureId: ecriture.id,
            compteDebitCode: ecriture.compteDebit.code,
            compteCreditCode: ecriture.compteCredit.code,
            montant: Number(ecriture.montant),
          },
        });
      }
    }

    return controles;
  }

  /**
   * Contrôle 9: Alertes trésorerie (risques de découvert, seuils)
   */
  private async controleAlertesTresorerie(
    societeId: string,
  ): Promise<ControleAudit[]> {
    const controles: ControleAudit[] = [];
    const maintenant = new Date();

    // Récupérer tous les comptes bancaires
    const comptesBancaires = await this.prisma.compteBancaire.findMany({
      where: { societeId },
      include: {
        transactions: {
          where: {
            date: { lte: maintenant },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    for (const compte of comptesBancaires) {
      // Calculer le solde actuel
      let solde = Number(compte.soldeInitial || 0);
      for (const transaction of compte.transactions) {
        solde += Number(transaction.montant);
      }

      // Alerte si solde négatif ou très faible
      if (solde < 0) {
        controles.push({
          type: 'ALERTE_TRESORERIE',
          severite: 'HAUTE',
          titre: `Compte ${compte.nom} en découvert`,
          description: `Le compte bancaire "${compte.nom}" présente un solde négatif de ${Math.abs(solde).toLocaleString('fr-FR')} FCFA`,
          dateDetection: maintenant,
          lien: `/comptes-bancaires`,
          metadata: {
            compteBancaireId: compte.id,
            compteNom: compte.nom,
            solde,
          },
        });
      } else if (solde < 100000) {
        // Solde < 100 000 FCFA = alerte moyenne
        controles.push({
          type: 'ALERTE_TRESORERIE',
          severite: 'MOYENNE',
          titre: `Solde faible sur le compte ${compte.nom}`,
          description: `Le compte "${compte.nom}" présente un solde faible de ${solde.toLocaleString('fr-FR')} FCFA`,
          dateDetection: maintenant,
          lien: `/comptes-bancaires`,
          metadata: {
            compteBancaireId: compte.id,
            compteNom: compte.nom,
            solde,
          },
        });
      }

      // Vérifier les factures impayées qui pourraient impacter la trésorerie
      const facturesImpayees = await this.prisma.facture.findMany({
        where: {
          societeId,
          statut: { in: ['ENVOYEE', 'BROUILLON'] },
        },
        include: {
          paiements: true,
        },
      });

      let totalImpaye = 0;
      for (const facture of facturesImpayees) {
        const totalPaye = facture.paiements.reduce((sum, p) => sum + Number(p.montant), 0);
        const resteAPayer = Number(facture.totalTTC) - totalPaye;
        if (resteAPayer > 0) {
          totalImpaye += resteAPayer;
        }
      }

      // Si le total impayé représente plus de 50% du solde actuel, alerte
      if (solde > 0 && totalImpaye > solde * 0.5) {
        controles.push({
          type: 'ALERTE_TRESORERIE',
          severite: 'MOYENNE',
          titre: `Risque de trésorerie : factures impayées importantes`,
          description: `Le total des factures impayées (${totalImpaye.toLocaleString('fr-FR')} FCFA) représente ${((totalImpaye / solde) * 100).toFixed(0)}% du solde actuel (${solde.toLocaleString('fr-FR')} FCFA)`,
          dateDetection: maintenant,
          lien: `/factures`,
          metadata: {
            solde,
            totalImpaye,
            pourcentage: (totalImpaye / solde) * 100,
          },
        });
      }
    }

    return controles;
  }
}
