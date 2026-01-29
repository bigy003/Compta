import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

interface CreateDeclarationDto {
  periode: string; // Format: "YYYY-MM"
}

@Injectable()
export class DeclarationsTvaService {
  constructor(private readonly prisma: PrismaService) {}

  // Calculer la TVA pour une période donnée
  async calculateTVA(societeId: string, periode: string) {
    const [year, month] = periode.split('-').map(Number);
    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0);
    toDate.setHours(23, 59, 59, 999);

    // Trouver les comptes TVA
    const compteTVACollectee = await this.prisma.compteComptable.findUnique({
      where: { code: '4451' },
    });
    const compteTVADeductible = await this.prisma.compteComptable.findUnique({
      where: { code: '4452' },
    });

    if (!compteTVACollectee || !compteTVADeductible) {
      throw new Error('Comptes TVA manquants. Veuillez initialiser le plan comptable.');
    }

    // Calculer TVA collectée (crédit du compte 4451)
    const ecrituresTVACollectee = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        compteCreditId: compteTVACollectee.id,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    const tvaCollectee = ecrituresTVACollectee.reduce(
      (sum, e) => sum + Number(e.montant),
      0,
    );

    // Calculer TVA déductible (débit du compte 4452)
    const ecrituresTVADeductible = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        compteDebitId: compteTVADeductible.id,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    const tvaDeductible = ecrituresTVADeductible.reduce(
      (sum, e) => sum + Number(e.montant),
      0,
    );

    // Calculer montants HT et TTC des ventes
    const compteVentes = await this.prisma.compteComptable.findUnique({
      where: { code: '707' },
    });

    let montantHTVentes = 0;
    let montantTTCVentes = 0;

    if (compteVentes) {
      const ecrituresVentes = await this.prisma.ecritureComptable.findMany({
        where: {
          societeId,
          compteCreditId: compteVentes.id,
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      });

      montantHTVentes = ecrituresVentes.reduce(
        (sum, e) => sum + Number(e.montant),
        0,
      );
      montantTTCVentes = montantHTVentes + tvaCollectee;
    }

    // Calculer montants HT et TTC des achats (approximation)
    const compteAchats = await this.prisma.compteComptable.findUnique({
      where: { code: '607' },
    });

    let montantHTAchats = 0;
    let montantTTCAchats = 0;

    if (compteAchats) {
      const ecrituresAchats = await this.prisma.ecritureComptable.findMany({
        where: {
          societeId,
          compteDebitId: compteAchats.id,
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      });

      montantHTAchats = ecrituresAchats.reduce(
        (sum, e) => sum + Number(e.montant),
        0,
      );
      montantTTCAchats = montantHTAchats + tvaDeductible;
    }

    const tvaAPayer = tvaCollectee - tvaDeductible;

    return {
      periode,
      tvaCollectee,
      tvaDeductible,
      tvaAPayer,
      montantHTVentes,
      montantTTCVentes,
      montantHTAchats,
      montantTTCAchats,
    };
  }

  // Créer ou mettre à jour une déclaration TVA
  async createOrUpdate(societeId: string, dto: CreateDeclarationDto) {
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
    });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    // Calculer les montants
    const calculs = await this.calculateTVA(societeId, dto.periode);

    // Vérifier si une déclaration existe déjà pour cette période
    const existing = await this.prisma.declarationTVA.findFirst({
      where: {
        societeId,
        periode: dto.periode,
      },
    });

    if (existing) {
      // Mettre à jour
      return this.prisma.declarationTVA.update({
        where: { id: existing.id },
        data: {
          tvaCollectee: calculs.tvaCollectee,
          tvaDeductible: calculs.tvaDeductible,
          tvaAPayer: calculs.tvaAPayer,
          montantHTVentes: calculs.montantHTVentes,
          montantTTCVentes: calculs.montantTTCVentes,
          montantHTAchats: calculs.montantHTAchats,
          montantTTCAchats: calculs.montantTTCAchats,
        },
      });
    } else {
      // Créer
      return this.prisma.declarationTVA.create({
        data: {
          societeId,
          periode: dto.periode,
          tvaCollectee: calculs.tvaCollectee,
          tvaDeductible: calculs.tvaDeductible,
          tvaAPayer: calculs.tvaAPayer,
          montantHTVentes: calculs.montantHTVentes,
          montantTTCVentes: calculs.montantTTCVentes,
          montantHTAchats: calculs.montantHTAchats,
          montantTTCAchats: calculs.montantTTCAchats,
        },
      });
    }
  }

  // Lister les déclarations
  listBySociete(societeId: string) {
    return this.prisma.declarationTVA.findMany({
      where: { societeId },
      orderBy: { periode: 'desc' },
    });
  }

  // Obtenir une déclaration par ID
  async getById(societeId: string, id: string) {
    const declaration = await this.prisma.declarationTVA.findFirst({
      where: { id, societeId },
    });

    if (!declaration) {
      throw new NotFoundException('Déclaration TVA introuvable');
    }

    return declaration;
  }

  // Mettre à jour le statut
  async updateStatut(
    societeId: string,
    id: string,
    statut: string,
  ) {
    const declaration = await this.prisma.declarationTVA.findFirst({
      where: { id, societeId },
    });

    if (!declaration) {
      throw new NotFoundException('Déclaration TVA introuvable');
    }

    const statutsValides = ['BROUILLON', 'ENVOYEE', 'VALIDEE'];
    if (!statutsValides.includes(statut)) {
      throw new Error(
        `Statut invalide. Statuts autorisés: ${statutsValides.join(', ')}`,
      );
    }

    return this.prisma.declarationTVA.update({
      where: { id },
      data: { statut },
    });
  }

  // Recalculer une déclaration
  async recalculate(societeId: string, id: string) {
    const declaration = await this.prisma.declarationTVA.findFirst({
      where: { id, societeId },
    });

    if (!declaration) {
      throw new NotFoundException('Déclaration TVA introuvable');
    }

    const calculs = await this.calculateTVA(societeId, declaration.periode);

    return this.prisma.declarationTVA.update({
      where: { id },
      data: {
        tvaCollectee: calculs.tvaCollectee,
        tvaDeductible: calculs.tvaDeductible,
        tvaAPayer: calculs.tvaAPayer,
        montantHTVentes: calculs.montantHTVentes,
        montantTTCVentes: calculs.montantTTCVentes,
        montantHTAchats: calculs.montantHTAchats,
        montantTTCAchats: calculs.montantTTCAchats,
      },
    });
  }

  // Générer le PDF de déclaration TVA au format officiel ivoirien
  async generatePdfStream(societeId: string, declarationId: string): Promise<PDFDocument> {
    const declaration = await this.getById(societeId, declarationId);
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
    });

    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    await this.fillPdfDocument(doc, declaration, societe);
    doc.end();

    return doc;
  }

  async generatePdfBuffer(societeId: string, declarationId: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.getById(societeId, declarationId)
        .then(async (declaration) => {
          const societe = await this.prisma.societe.findUnique({
            where: { id: societeId },
          });
          if (!societe) {
            throw new NotFoundException('Société introuvable');
          }
          await this.fillPdfDocument(doc, declaration, societe);
          doc.end();
        })
        .catch(reject);
    });
  }

  // Formater un montant avec des espaces comme séparateurs de milliers (compatible PDFKit)
  private formatMontant(montant: number): string {
    return Math.round(montant)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  private async fillPdfDocument(
    doc: PDFDocument,
    declaration: any,
    societe: any,
  ): Promise<void> {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    // ===== EN-TÊTE =====
    const headerY = margin;
    
    // Titre principal - divisé en deux lignes pour éviter le chevauchement
    doc.fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('DÉCLARATION DE TAXE SUR LA VALEUR', margin, headerY, {
        align: 'center',
        width: contentWidth,
      });

    doc.fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('AJOUTÉE (TVA)', margin, headerY + 22, {
        align: 'center',
        width: contentWidth,
      });

    // Sous-titre
    doc.fontSize(9)
      .fillColor('#6b7280')
      .font('Helvetica')
      .text('République de Côte d\'Ivoire - Direction Générale des Impôts', margin, headerY + 50, {
        align: 'center',
        width: contentWidth,
      });

    // Ligne de séparation
    doc.moveTo(margin, headerY + 70)
      .lineTo(pageWidth - margin, headerY + 70)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    let currentY = headerY + 90;

    // ===== INFORMATIONS SOCIÉTÉ =====
    doc.fontSize(12)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('INFORMATIONS DU DÉCLARANT:', margin, currentY);
    
    currentY += 20;
    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica');

    const infosSociete = [
      `Raison sociale: ${societe.nom}`,
      societe.rccm ? `RCCM: ${societe.rccm}` : null,
      societe.compteContribuable ? `N° Compte Contribuable: ${societe.compteContribuable}` : null,
      societe.regimeTva ? `Régime TVA: ${societe.regimeTva}` : null,
      societe.adresse ? `Adresse: ${societe.adresse}` : null,
    ].filter(Boolean);

    infosSociete.forEach((info) => {
      doc.text(info as string, margin, currentY);
      currentY += 15;
    });

    currentY += 10;

    // ===== PÉRIODE DE DÉCLARATION =====
    const [year, month] = declaration.periode.split('-');
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthName = monthNames[parseInt(month) - 1];

    doc.fontSize(12)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('PÉRIODE DE DÉCLARATION:', margin, currentY);
    
    currentY += 20;
    doc.fontSize(11)
      .fillColor('#374151')
      .font('Helvetica')
      .text(`${monthName} ${year}`, margin, currentY);

    currentY += 30;

    // ===== TABLEAU DES MONTANTS =====
    const tableTop = currentY;
    const colWidth = contentWidth / 2;
    const rowHeight = 25;

    // En-tête du tableau
    doc.fontSize(10)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .rect(margin, tableTop, contentWidth, rowHeight)
      .fill('#1f2937');

    doc.text('DÉSIGNATION', margin + 10, tableTop + 8);
    doc.text('MONTANT (FCFA)', margin + colWidth + 10, tableTop + 8, { align: 'right', width: colWidth - 20 });

    let tableY = tableTop + rowHeight;

    // Ligne 1: Ventes HT
    doc.rect(margin, tableY, contentWidth, rowHeight)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica')
      .text('Montant HT des ventes', margin + 10, tableY + 8);
    doc.text(
      this.formatMontant(Number(declaration.montantHTVentes)),
      margin + colWidth + 10,
      tableY + 8,
      { align: 'right', width: colWidth - 20 }
    );
    tableY += rowHeight;

    // Ligne 2: TVA Collectée
    doc.rect(margin, tableY, contentWidth, rowHeight)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
    doc.text('TVA Collectée (sur ventes)', margin + 10, tableY + 8);
    doc.text(
      this.formatMontant(Number(declaration.tvaCollectee)),
      margin + colWidth + 10,
      tableY + 8,
      { align: 'right', width: colWidth - 20 }
    );
    tableY += rowHeight;

    // Ligne 3: Ventes TTC
    doc.rect(margin, tableY, contentWidth, rowHeight)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
    doc.text('Montant TTC des ventes', margin + 10, tableY + 8);
    doc.text(
      this.formatMontant(Number(declaration.montantTTCVentes)),
      margin + colWidth + 10,
      tableY + 8,
      { align: 'right', width: colWidth - 20 }
    );
    tableY += rowHeight;

    // Ligne 4: Achats HT
    doc.rect(margin, tableY, contentWidth, rowHeight)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
    doc.text('Montant HT des achats', margin + 10, tableY + 8);
    doc.text(
      this.formatMontant(Number(declaration.montantHTAchats)),
      margin + colWidth + 10,
      tableY + 8,
      { align: 'right', width: colWidth - 20 }
    );
    tableY += rowHeight;

    // Ligne 5: TVA Déductible
    doc.rect(margin, tableY, contentWidth, rowHeight)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
    doc.text('TVA Déductible (sur achats)', margin + 10, tableY + 8);
    doc.text(
      this.formatMontant(Number(declaration.tvaDeductible)),
      margin + colWidth + 10,
      tableY + 8,
      { align: 'right', width: colWidth - 20 }
    );
    tableY += rowHeight;

    // Ligne 6: Achats TTC
    doc.rect(margin, tableY, contentWidth, rowHeight)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
    doc.text('Montant TTC des achats', margin + 10, tableY + 8);
    doc.text(
      this.formatMontant(Number(declaration.montantTTCAchats)),
      margin + colWidth + 10,
      tableY + 8,
      { align: 'right', width: colWidth - 20 }
    );
    tableY += rowHeight;

    // Ligne TOTAL: TVA à Payer
    doc.rect(margin, tableY, contentWidth, rowHeight)
      .fillColor('#f3f4f6')
      .fill()
      .strokeColor('#1f2937')
      .lineWidth(2)
      .stroke();
    doc.fontSize(11)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('TVA À PAYER', margin + 10, tableY + 8);
    
    const tvaAPayer = Number(declaration.tvaAPayer);
    const tvaAPayerColor = tvaAPayer >= 0 ? '#059669' : '#dc2626';
    doc.fillColor(tvaAPayerColor)
      .text(
        `${tvaAPayer >= 0 ? '+' : ''}${this.formatMontant(Math.abs(tvaAPayer))} FCFA`,
        margin + colWidth + 10,
        tableY + 8,
        { align: 'right', width: colWidth - 20 }
      );

    tableY += rowHeight + 20;

    // ===== STATUT =====
    const statutLabels: Record<string, string> = {
      'BROUILLON': 'Brouillon',
      'ENVOYEE': 'Envoyée',
      'VALIDEE': 'Validée',
    };

    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica')
      .text(`Statut: ${statutLabels[declaration.statut] || declaration.statut}`, margin, tableY);

    tableY += 15;
    doc.text(
      `Date de déclaration: ${new Date(declaration.dateDeclaration).toLocaleDateString('fr-FR')}`,
      margin,
      tableY
    );

    // ===== PIED DE PAGE =====
    const footerY = pageHeight - margin - 30;
    doc.fontSize(8)
      .fillColor('#9ca3af')
      .font('Helvetica')
      .text(
        'Document généré automatiquement - Conforme à la réglementation fiscale ivoirienne',
        margin,
        footerY,
        { align: 'center', width: contentWidth }
      );
  }
}
