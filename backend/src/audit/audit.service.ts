import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

export interface ControleAudit {
  type: 'FACTURE_NON_PAYEE' | 'RAPPROCHEMENT_A_VALIDER' | 'DOCUMENT_MANQUANT' | 'DOUBLON_DETECTE';
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
      },
      parSeverite: {
        HAUTE: 0,
        MOYENNE: 0,
        BASSE: 0,
      },
    };

    for (const controle of controles) {
      resume.parType[controle.type]++;
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
      doc.text(`Par type - Factures non payées : ${resume.parType.FACTURE_NON_PAYEE} | Rapprochements à valider : ${resume.parType.RAPPROCHEMENT_A_VALIDER} | Documents manquants : ${resume.parType.DOCUMENT_MANQUANT} | Doublons : ${resume.parType.DOUBLON_DETECTE}`, margin, y);
      y += 28;

      // Liste des contrôles
      doc.fontSize(14).font('Helvetica-Bold').text('Détail des contrôles', margin, y);
      y += 22;

      const typeLabels: Record<string, string> = {
        FACTURE_NON_PAYEE: 'Facture non payée',
        RAPPROCHEMENT_A_VALIDER: 'Rapprochement à valider',
        DOCUMENT_MANQUANT: 'Document manquant',
        DOUBLON_DETECTE: 'Doublon détecté',
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
}
