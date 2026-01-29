import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { PlanComptableService } from '../plan-comptable/plan-comptable.service';
import { EmailService } from '../email/email.service';

interface FactureLigneInput {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA?: number;
}

interface CreateFactureDto {
  clientId: string;
  date: string; // ISO string
  lignes: FactureLigneInput[];
}

@Injectable()
export class FacturesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PlanComptableService))
    private readonly planComptableService: PlanComptableService,
    private readonly emailService: EmailService,
  ) {}

  listBySociete(societeId: string, from?: string, to?: string) {
    const where: any = { societeId };
    
    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        // Ajouter 1 jour pour inclure toute la journée
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    return this.prisma.facture.findMany({
      where,
      include: { client: true },
      orderBy: { date: 'desc' },
    });
  }

  async createForSociete(
    societeId: string,
    dto: CreateFactureDto,
  ) {
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
    });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, societeId },
    });
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

    // calcul des montants
    let totalHT = 0;
    let totalTVA = 0;

    const lignesData = dto.lignes.map((l) => {
      const tauxTVA = l.tauxTVA ?? 0;
      const montantHT = l.quantite * l.prixUnitaire;
      const montantTVA = (montantHT * tauxTVA) / 100;
      const montantTTC = montantHT + montantTVA;

      totalHT += montantHT;
      totalTVA += montantTVA;

      return {
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        tauxTVA,
        montantHT,
        montantTVA,
        montantTTC,
      };
    });

    const totalTTC = totalHT + totalTVA;

    // numéro simple: FACT-aaaaMMjj-HHMMSS
    const now = new Date();
    const numero = `FACT-${now
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14)}`;

    const facture = await this.prisma.facture.create({
      data: {
        societeId,
        clientId: dto.clientId,
        numero,
        date: new Date(dto.date),
        totalHT,
        totalTVA,
        totalTTC,
        lignes: {
          create: lignesData,
        },
      },
      include: { client: true, lignes: true },
    });

    // Générer les écritures comptables automatiquement
    try {
      await this.planComptableService.generateEcritureFromFacture(
        societeId,
        facture.id,
        facture.numero,
        facture.date,
        Number(facture.totalHT),
        Number(facture.totalTVA),
        Number(facture.totalTTC),
      );
    } catch (error) {
      // Ne pas bloquer la création de la facture si l'écriture échoue
      console.error('Erreur génération écriture comptable:', error);
    }

    return facture;
  }

  async getById(societeId: string, factureId: string) {
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
      include: { client: true, lignes: true },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    return facture;
  }

  async updateFacture(
    societeId: string,
    factureId: string,
    dto: Partial<CreateFactureDto>,
  ) {
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
      include: { lignes: true },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    // Vérifier que la facture peut être modifiée
    if (facture.statut === 'PAYEE') {
      throw new Error('Impossible de modifier une facture déjà payée');
    }
    if (facture.statut === 'ANNULEE') {
      throw new Error('Impossible de modifier une facture annulée');
    }

    const updateData: any = {};

    // Mettre à jour la date si fournie
    if (dto.date) {
      updateData.date = new Date(dto.date);
    }

    // Mettre à jour le client si fourni
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, societeId },
      });
      if (!client) {
        throw new NotFoundException('Client introuvable');
      }
      updateData.clientId = dto.clientId;
    }

    // Si les lignes sont modifiées, recalculer les totaux
    if (dto.lignes) {
      let totalHT = 0;
      let totalTVA = 0;

      const lignesData = dto.lignes.map((l) => {
        const tauxTVA = l.tauxTVA ?? 0;
        const montantHT = l.quantite * l.prixUnitaire;
        const montantTVA = (montantHT * tauxTVA) / 100;
        const montantTTC = montantHT + montantTVA;

        totalHT += montantHT;
        totalTVA += montantTVA;

        return {
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          tauxTVA,
          montantHT,
          montantTVA,
          montantTTC,
        };
      });

      updateData.totalHT = totalHT;
      updateData.totalTVA = totalTVA;
      updateData.totalTTC = totalHT + totalTVA;

      // Supprimer les anciennes lignes
      await this.prisma.factureLigne.deleteMany({
        where: { factureId },
      });

      // Créer les nouvelles lignes
      updateData.lignes = {
        create: lignesData,
      };

      // Mettre à jour les écritures comptables si la facture a déjà des écritures
      // On supprime les anciennes et on en crée de nouvelles
      try {
        // Supprimer les anciennes écritures liées à cette facture
        await this.prisma.ecritureComptable.deleteMany({
          where: {
            societeId,
            pieceJustificative: facture.numero,
          },
        });

        // Créer les nouvelles écritures
        await this.planComptableService.generateEcritureFromFacture(
          societeId,
          facture.id,
          facture.numero,
          updateData.date || facture.date,
          totalHT,
          totalTVA,
          totalHT + totalTVA,
        );
      } catch (error) {
        console.error('Erreur mise à jour écritures comptables:', error);
        // Ne pas bloquer la mise à jour de la facture
      }
    }

    return this.prisma.facture.update({
      where: { id: factureId },
      data: updateData,
      include: { client: true, lignes: true },
    });
  }

  async updateStatut(societeId: string, factureId: string, statut: string) {
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    const statutsValides = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];
    if (!statutsValides.includes(statut)) {
      throw new Error(`Statut invalide. Statuts autorisés: ${statutsValides.join(', ')}`);
    }

    return this.prisma.facture.update({
      where: { id: factureId },
      data: { statut },
      include: { client: true },
    });
  }

  // Formater un montant avec des espaces comme séparateurs de milliers (compatible PDFKit)
  private formatMontant(montant: number): string {
    return Math.round(montant)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  private async fillPdfDocument(doc: PDFDocument, facture: any): Promise<void> {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    // ===== EN-TÊTE AVEC LOGO =====
    const headerY = margin;
    
    // Placeholder logo (rectangle avec texte)
    doc.rect(margin, headerY, 80, 50)
      .strokeColor('#1f2937')
      .lineWidth(2)
      .stroke();
    doc.fontSize(10)
      .fillColor('#6b7280')
      .text('LOGO', margin + 10, headerY + 15, { width: 60, align: 'center' });

    // Titre FACTURE à droite
    doc.fontSize(28)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('FACTURE', margin + 100, headerY + 10, { align: 'right', width: contentWidth - 100 });

    // Ligne de séparation
    doc.moveTo(margin, headerY + 60)
      .lineTo(pageWidth - margin, headerY + 60)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    let currentY = headerY + 80;

    // ===== INFORMATIONS SOCIÉTÉ (Vendeur) =====
    doc.fontSize(12)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('FACTURÉ PAR:', margin, currentY);
    
    currentY += 20;
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text(facture.societe.nom, margin, currentY);
    currentY += 20;

    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica');

    if (facture.societe.adresse) {
      doc.text(facture.societe.adresse, margin, currentY);
      currentY += 15;
    }
    
    if (facture.societe.rccm) {
      doc.text(`RCCM: ${facture.societe.rccm}`, margin, currentY);
      currentY += 15;
    }
    
    if (facture.societe.compteContribuable) {
      doc.text(`Compte contribuable: ${facture.societe.compteContribuable}`, margin, currentY);
      currentY += 15;
    }

    if (facture.societe.regimeTva) {
      doc.text(`Régime TVA: ${facture.societe.regimeTva}`, margin, currentY);
      currentY += 15;
    }

    // ===== INFORMATIONS FACTURE ET CLIENT (à droite) =====
    const rightColumnX = pageWidth - margin - 200;
    let rightY = headerY + 80;

    doc.fontSize(10)
      .fillColor('#6b7280')
      .text('N° Facture:', rightColumnX, rightY);
    doc.fontSize(12)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(facture.numero, rightColumnX + 70, rightY);
    rightY += 20;

    doc.fontSize(10)
      .fillColor('#6b7280')
      .font('Helvetica')
      .text('Date d\'émission: ', rightColumnX, rightY);
    doc.fontSize(11)
      .fillColor('#111827')
      .text(
        new Date(facture.date).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        rightColumnX + 85,
        rightY,
      );
    rightY += 30;

    doc.fontSize(12)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('FACTURÉ À:', rightColumnX, rightY);
    rightY += 20;

    doc.fontSize(11)
      .font('Helvetica')
      .text(facture.client.nom, rightColumnX, rightY);
    rightY += 15;

    if (facture.client.adresse) {
      doc.fontSize(10)
        .fillColor('#374151')
        .text(facture.client.adresse, rightColumnX, rightY);
      rightY += 15;
    }

    if (facture.client.email) {
      doc.text(`Email: ${facture.client.email}`, rightColumnX, rightY);
      rightY += 15;
    }

    if (facture.client.telephone) {
      doc.text(`Tél: ${facture.client.telephone}`, rightColumnX, rightY);
    }

    // Position Y pour le tableau (prendre le max des deux colonnes)
    currentY = Math.max(currentY, rightY) + 30;

    // ===== TABLEAU DES LIGNES =====
    const tableTop = currentY;
    const colWidths = {
      designation: 150,
      quantite: 30,
      pu: 55,
      tva: 35,
      montantHT: 75,
      montantTTC: 80,
    };

    // En-tête du tableau
    doc.rect(margin, tableTop, contentWidth, 28)
      .fillColor('#1f2937')
      .fill();

    doc.fontSize(10)
      .fillColor('#ffffff')
      .font('Helvetica-Bold');

    let colX = margin + 5;
    doc.text('Désignation', colX, tableTop + 9, { width: colWidths.designation });
    colX += colWidths.designation + 3;
    doc.text('Qté', colX, tableTop + 9, { width: colWidths.quantite, align: 'center' });
    colX += colWidths.quantite + 3;
    doc.text('P.U. HT', colX, tableTop + 9, { width: colWidths.pu, align: 'right' });
    colX += colWidths.pu + 3;
    doc.text('TVA %', colX, tableTop + 9, { width: colWidths.tva, align: 'center' });
    colX += colWidths.tva + 3;
    doc.text('Montant HT', colX, tableTop + 9, { width: colWidths.montantHT, align: 'right' });
    colX += colWidths.montantHT + 3;
    doc.text('Montant TTC', colX, tableTop + 9, { width: colWidths.montantTTC, align: 'right' });

    // Lignes du tableau
    let rowY = tableTop + 28;
    facture.lignes.forEach((ligne, index) => {
      const rowHeight = 30;
      const isEven = index % 2 === 0;
      
      if (isEven) {
        doc.rect(margin, rowY, contentWidth, rowHeight)
          .fillColor('#f9fafb')
          .fill();
      }

      colX = margin + 5;
      doc.fontSize(9)
        .fillColor('#111827')
        .font('Helvetica')
        .text(ligne.designation, colX, rowY + 8, { width: colWidths.designation });
      
      colX += colWidths.designation + 3;
      doc.text(String(ligne.quantite), colX, rowY + 8, { width: colWidths.quantite, align: 'center' });
      
      colX += colWidths.quantite + 3;
      doc.text(
        this.formatMontant(Number(ligne.prixUnitaire)),
        colX,
        rowY + 8,
        { width: colWidths.pu, align: 'right' },
      );
      
      colX += colWidths.pu + 3;
      doc.text(
        Number(ligne.tauxTVA).toFixed(0),
        colX,
        rowY + 8,
        { width: colWidths.tva, align: 'center' },
      );
      
      colX += colWidths.tva + 3;
      doc.text(
        this.formatMontant(Number(ligne.montantHT)),
        colX,
        rowY + 8,
        { width: colWidths.montantHT, align: 'right' },
      );
      
      colX += colWidths.montantHT + 3;
      doc.font('Helvetica-Bold')
        .text(
          this.formatMontant(Number(ligne.montantTTC)),
          colX,
          rowY + 8,
          { width: colWidths.montantTTC, align: 'right' },
        );
      
      doc.font('Helvetica');
      rowY += rowHeight;
    });

    // Bordure du tableau
    doc.rect(margin, tableTop, contentWidth, rowY - tableTop)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    // ===== TOTAUX =====
    const totalsY = rowY + 20;
    const totalsX = pageWidth - margin - 250;

    doc.fontSize(10)
      .fillColor('#374151')
      .text('Total HT:', totalsX, totalsY, { width: 150, align: 'right' });
    doc.fontSize(11)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(
        `${this.formatMontant(Number(facture.totalHT))} FCFA`,
        totalsX + 160,
        totalsY,
      );

    const tvaY = totalsY + 20;
    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica')
      .text('Total TVA:', totalsX, tvaY, { width: 150, align: 'right' });
    doc.fontSize(11)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(
        `${this.formatMontant(Number(facture.totalTVA))} FCFA`,
        totalsX + 160,
        tvaY,
      );

    const ttcY = tvaY + 25;
    // Augmenter la hauteur du rectangle pour éviter que le texte soit coupé
    const ttcRectHeight = 40;
    const ttcRectTop = ttcY - 5;
    doc.rect(totalsX - 10, ttcRectTop, 320, ttcRectHeight)
      .fillColor('#1f2937')
      .fill();
    // Centrer verticalement le texte dans le rectangle
    const textY = ttcRectTop + (ttcRectHeight / 2) - 6; // -6 pour centrer approximativement
    doc.fontSize(12)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('Total TTC:', totalsX, textY, { width: 150, align: 'right' });
    doc.fontSize(14)
      .text(
        `${this.formatMontant(Number(facture.totalTTC))} FCFA`,
        totalsX + 160,
        textY,
        { width: 150 }
      );

    // ===== MENTIONS LÉGALES SYSCOHADA =====
    const legalY = ttcY + ttcRectHeight + 15;
    
    // Vérifier si on a assez de place, sinon nouvelle page
    if (legalY > pageHeight - 150) {
      doc.addPage();
      currentY = margin;
    } else {
      currentY = legalY;
    }

    doc.moveTo(margin, currentY)
      .lineTo(pageWidth - margin, currentY)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();
    
    currentY += 15;

    doc.fontSize(8)
      .fillColor('#6b7280')
      .font('Helvetica')
      .text(
        'MENTIONS LÉGALES - CONFORMITÉ SYSCOHADA',
        margin,
        currentY,
        { width: contentWidth, align: 'center' },
      );
    
    currentY += 15;
    
    const legalText = [
      `Cette facture est établie conformément au Système Comptable OHADA (SYSCOHADA) révisé.`,
      `Facture soumise à la TVA selon le régime fiscal ivoirien en vigueur.`,
      `En cas de retard de paiement, des pénalités de retard au taux légal pourront être appliquées.`,
      `Conformément à la réglementation en vigueur en Côte d'Ivoire.`,
    ];

    legalText.forEach((text) => {
      doc.fontSize(7)
        .fillColor('#6b7280')
        .text(`• ${text}`, margin + 10, currentY, { width: contentWidth - 20 });
      currentY += 12;
    });

    currentY += 10;
    doc.fontSize(7)
      .fillColor('#9ca3af')
      .text(
        `Document généré le ${new Date().toLocaleDateString('fr-FR')} - Facture n° ${facture.numero}`,
        margin,
        currentY,
        { width: contentWidth, align: 'center' },
      );
  }

  async generatePdfStream(factureId: string): Promise<PDFDocument> {
    const facture = await this.prisma.facture.findUnique({
      where: { id: factureId },
      include: {
        client: true,
        societe: true,
        lignes: true,
      },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
    });

    await this.fillPdfDocument(doc, facture);
    doc.end();
    return doc;
  }

  async generatePdfBuffer(factureId: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const facture = await this.prisma.facture.findUnique({
          where: { id: factureId },
          include: {
            client: true,
            societe: true,
            lignes: true,
          },
        });

        if (!facture) {
          reject(new NotFoundException('Facture introuvable'));
          return;
        }

        // Réutiliser la logique de generatePdfStream
        await this.fillPdfDocument(doc, facture);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async sendInvoiceByEmail(
    societeId: string,
    factureId: string,
    recipientEmail?: string,
  ): Promise<void> {
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, societeId },
      include: {
        client: true,
        societe: true,
      },
    });

    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    // Utiliser l'email du client si non fourni
    const email = recipientEmail || facture.client.email;
    if (!email) {
      throw new Error('Aucune adresse email disponible pour envoyer la facture');
    }

    // Générer le PDF en buffer
    const pdfBuffer = await this.generatePdfBuffer(factureId);

    // Envoyer l'email
    await this.emailService.sendInvoiceEmail(
      email,
      `Facture ${facture.numero} - ${facture.societe.nom}`,
      pdfBuffer,
      facture.numero,
      facture.societe.nom,
    );
  }
}

