import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { FacturesService } from '../factures/factures.service';

interface DevisLigneInput {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA?: number;
}

interface CreateDevisDto {
  clientId: string;
  date: string; // ISO string
  dateValidite?: string; // ISO string (optionnel)
  lignes: DevisLigneInput[];
}

@Injectable()
export class DevisService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FacturesService))
    private readonly facturesService: FacturesService,
  ) {}

  listBySociete(societeId: string, from?: string, to?: string) {
    const where: any = { societeId };
    
    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    return this.prisma.devis.findMany({
      where,
      include: { client: true, facture: true },
      orderBy: { date: 'desc' },
    });
  }

  async createForSociete(
    societeId: string,
    dto: CreateDevisDto,
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

    // numéro simple: DEVIS-aaaaMMjj-HHMMSS
    const now = new Date();
    const numero = `DEVIS-${now
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14)}`;

    return this.prisma.devis.create({
      data: {
        societeId,
        clientId: dto.clientId,
        numero,
        date: new Date(dto.date),
        dateValidite: dto.dateValidite ? new Date(dto.dateValidite) : null,
        totalHT,
        totalTVA,
        totalTTC,
        lignes: {
          create: lignesData,
        },
      },
      include: { client: true, lignes: true },
    });
  }

  async getById(societeId: string, devisId: string) {
    const devis = await this.prisma.devis.findFirst({
      where: { id: devisId, societeId },
      include: { client: true, lignes: true, facture: true },
    });

    if (!devis) {
      throw new NotFoundException('Devis introuvable');
    }

    return devis;
  }

  async updateDevis(
    societeId: string,
    devisId: string,
    dto: Partial<CreateDevisDto>,
  ) {
    const devis = await this.prisma.devis.findFirst({
      where: { id: devisId, societeId },
    });

    if (!devis) {
      throw new NotFoundException('Devis introuvable');
    }

    // Si le devis est déjà converti, on ne peut pas le modifier
    if (devis.statut === 'CONVERTI') {
      throw new Error('Impossible de modifier un devis déjà converti en facture');
    }

    const updateData: any = {};

    if (dto.date) {
      updateData.date = new Date(dto.date);
    }
    if (dto.dateValidite !== undefined) {
      updateData.dateValidite = dto.dateValidite ? new Date(dto.dateValidite) : null;
    }
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

      // Supprimer les anciennes lignes et créer les nouvelles
      await this.prisma.devisLigne.deleteMany({
        where: { devisId },
      });

      updateData.lignes = {
        create: lignesData,
      };
    }

    return this.prisma.devis.update({
      where: { id: devisId },
      data: updateData,
      include: { client: true, lignes: true },
    });
  }

  async updateStatut(societeId: string, devisId: string, statut: string) {
    const devis = await this.prisma.devis.findFirst({
      where: { id: devisId, societeId },
    });

    if (!devis) {
      throw new NotFoundException('Devis introuvable');
    }

    const statutsValides = ['BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'CONVERTI'];
    if (!statutsValides.includes(statut)) {
      throw new Error(`Statut invalide. Statuts autorisés: ${statutsValides.join(', ')}`);
    }

    return this.prisma.devis.update({
      where: { id: devisId },
      data: { statut },
    });
  }

  async deleteDevis(societeId: string, devisId: string) {
    const devis = await this.prisma.devis.findFirst({
      where: { id: devisId, societeId },
      include: { facture: true },
    });

    if (!devis) {
      throw new NotFoundException('Devis introuvable');
    }

    // Si le devis est converti, on ne peut pas le supprimer
    if (devis.statut === 'CONVERTI' || devis.factureId) {
      throw new Error('Impossible de supprimer un devis converti en facture');
    }

    return this.prisma.devis.delete({
      where: { id: devisId },
    });
  }

  // Convertir un devis en facture
  async convertirEnFacture(societeId: string, devisId: string, dateFacture?: string) {
    const devis = await this.prisma.devis.findFirst({
      where: { id: devisId, societeId },
      include: { client: true, lignes: true, facture: true },
    });

    if (!devis) {
      throw new NotFoundException('Devis introuvable');
    }

    // Vérifier que le devis n'est pas déjà converti
    if (devis.statut === 'CONVERTI' || devis.factureId) {
      throw new Error('Ce devis a déjà été converti en facture');
    }

    // Créer la facture à partir du devis
    const facture = await this.facturesService.createForSociete(societeId, {
      clientId: devis.clientId,
      date: dateFacture || new Date().toISOString(),
      lignes: devis.lignes.map((l) => ({
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: Number(l.prixUnitaire),
        tauxTVA: Number(l.tauxTVA),
      })),
    });

    // Mettre à jour le devis pour indiquer qu'il est converti
    await this.prisma.devis.update({
      where: { id: devisId },
      data: {
        statut: 'CONVERTI',
        factureId: facture.id,
      },
    });

    return facture;
  }

  // Générer un PDF pour le devis
  async generatePdfStream(devisId: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        client: true,
        societe: true,
        lignes: true,
      },
    });

    if (!devis) {
      throw new NotFoundException('Devis introuvable');
    }

    // Fonction helper pour formater les nombres avec espaces
    const formatNumber = (num: number): string => {
      return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
    });

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

    // Titre DEVIS à droite
    doc.fontSize(28)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('DEVIS', margin + 100, headerY + 10, { align: 'right', width: contentWidth - 100 });

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
      .text('DEVIS ÉTABLI PAR:', margin, currentY);
    
    currentY += 20;
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text(devis.societe.nom, margin, currentY);
    currentY += 20;

    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica');

    if (devis.societe.adresse) {
      doc.text(devis.societe.adresse, margin, currentY);
      currentY += 15;
    }
    
    if (devis.societe.rccm) {
      doc.text(`RCCM: ${devis.societe.rccm}`, margin, currentY);
      currentY += 15;
    }
    
    if (devis.societe.compteContribuable) {
      doc.text(`Compte contribuable: ${devis.societe.compteContribuable}`, margin, currentY);
      currentY += 15;
    }

    if (devis.societe.regimeTva) {
      doc.text(`Régime TVA: ${devis.societe.regimeTva}`, margin, currentY);
      currentY += 15;
    }

    // ===== INFORMATIONS DEVIS ET CLIENT (à droite) =====
    const rightColumnX = pageWidth - margin - 200;
    let rightY = headerY + 80;

    // Numéro de devis - mettre le numéro sur la ligne suivante pour éviter tout débordement
    doc.fontSize(10)
      .fillColor('#6b7280')
      .text('N° Devis:', rightColumnX, rightY);
    rightY += 15; // Ligne suivante pour le numéro
    // Tronquer le numéro si trop long
    const numeroMaxWidth = pageWidth - margin - rightColumnX - 10; // 10px de marge
    const numeroDisplay = devis.numero.length > 25 ? devis.numero.substring(0, 22) + '...' : devis.numero;
    doc.fontSize(12)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(numeroDisplay, rightColumnX, rightY, { 
        width: numeroMaxWidth,
        ellipsis: true
      });
    rightY += 20;

    // Date d'émission
    doc.fontSize(10)
      .fillColor('#6b7280')
      .font('Helvetica')
      .text('Date d\'émission:', rightColumnX, rightY);
    const dateText = new Date(devis.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const dateMaxWidth = pageWidth - margin - rightColumnX - 10;
    doc.fontSize(11)
      .fillColor('#111827')
      .text(dateText, rightColumnX + 100, rightY, { width: dateMaxWidth - 100 });
    rightY += 20;

    if (devis.dateValidite) {
      doc.fontSize(10)
        .fillColor('#6b7280')
        .text('Valable jusqu\'au: ', rightColumnX, rightY);
      doc.fontSize(11)
        .fillColor('#111827')
        .text(
          new Date(devis.dateValidite).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          rightColumnX + 85,
          rightY,
        );
      rightY += 20;
    }

    doc.fontSize(9)
      .fillColor('#6b7280')
      .text(`Statut: ${devis.statut}`, rightColumnX, rightY);
    rightY += 30;

    doc.fontSize(12)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('DEVIS POUR:', rightColumnX, rightY);
    rightY += 20;

    doc.fontSize(11)
      .font('Helvetica')
      .text(devis.client.nom, rightColumnX, rightY);
    rightY += 15;

    if (devis.client.adresse) {
      doc.fontSize(10)
        .fillColor('#374151')
        .text(devis.client.adresse, rightColumnX, rightY);
      rightY += 15;
    }

    if (devis.client.email) {
      doc.text(`Email: ${devis.client.email}`, rightColumnX, rightY);
      rightY += 15;
    }

    if (devis.client.telephone) {
      doc.text(`Tél: ${devis.client.telephone}`, rightColumnX, rightY);
    }

    // Position Y pour le tableau (prendre le max des deux colonnes)
    currentY = Math.max(currentY, rightY) + 30;

    // ===== TABLEAU DES LIGNES =====
    const tableTop = currentY;
    const colSpacing = 5;
    
    // Largeurs fixes et calculées pour garantir que le tableau tient dans la page
    // Largeur disponible = pageWidth - 2*margin = contentWidth
    const maxTableWidth = contentWidth;
    const totalColSpacing = 5 * colSpacing; // 5 espaces entre 6 colonnes
    
    // Colonnes fixes
    const fixedCols = {
      quantite: 45,
      pu: 75,
      tva: 45,
    };
    
    // Largeur disponible pour les colonnes variables
    const fixedColsTotal = fixedCols.quantite + fixedCols.pu + fixedCols.tva;
    const availableForVariable = maxTableWidth - totalColSpacing - fixedColsTotal;
    
    // Répartir l'espace restant entre désignation, montant HT et montant TTC
    const colWidths = {
      designation: Math.floor(availableForVariable * 0.42),
      quantite: fixedCols.quantite,
      pu: fixedCols.pu,
      tva: fixedCols.tva,
      montantHT: Math.floor(availableForVariable * 0.29),
      montantTTC: Math.floor(availableForVariable * 0.29),
    };
    
    // Vérification finale : s'assurer que le total ne dépasse jamais
    const totalCalculated = colWidths.designation + colWidths.quantite + colWidths.pu + 
                           colWidths.tva + colWidths.montantHT + colWidths.montantTTC + totalColSpacing;
    
    if (totalCalculated > maxTableWidth) {
      const excess = totalCalculated - maxTableWidth;
      // Réduire les colonnes variables proportionnellement
      colWidths.designation = Math.max(100, colWidths.designation - Math.floor(excess * 0.4));
      colWidths.montantHT = Math.max(60, colWidths.montantHT - Math.floor(excess * 0.3));
      colWidths.montantTTC = Math.max(60, colWidths.montantTTC - Math.floor(excess * 0.3));
    }
    
    // Largeur finale du tableau (ne doit JAMAIS dépasser maxTableWidth)
    const calculatedTableWidth = colWidths.designation + colWidths.quantite + colWidths.pu + 
                                 colWidths.tva + colWidths.montantHT + colWidths.montantTTC + totalColSpacing;
    const tableWidth = Math.min(calculatedTableWidth, maxTableWidth);
    
    // DEBUG: S'assurer que tableWidth ne dépasse JAMAIS contentWidth
    if (tableWidth > contentWidth) {
      console.warn(`Table width ${tableWidth} exceeds contentWidth ${contentWidth}, forcing to contentWidth`);
    }
    const finalTableWidth = Math.min(tableWidth, contentWidth);
    
    // En-tête du tableau - utiliser finalTableWidth
    doc.rect(margin, tableTop, finalTableWidth, 28)
      .fillColor('#1f2937')
      .fill();

    doc.fontSize(10)
      .fillColor('#ffffff')
      .font('Helvetica-Bold');

    let colX = margin + colSpacing;
    doc.text('Désignation', colX, tableTop + 9, { width: colWidths.designation });
    colX += colWidths.designation + colSpacing;
    doc.text('Qté', colX, tableTop + 9, { width: colWidths.quantite, align: 'center' });
    colX += colWidths.quantite + colSpacing;
    doc.text('P.U. HT', colX, tableTop + 9, { width: colWidths.pu, align: 'right' });
    colX += colWidths.pu + colSpacing;
    doc.text('TVA %', colX, tableTop + 9, { width: colWidths.tva, align: 'center' });
    colX += colWidths.tva + colSpacing;
    doc.text('Montant HT', colX, tableTop + 9, { width: colWidths.montantHT, align: 'right' });
    colX += colWidths.montantHT + colSpacing;
    // S'assurer que la dernière colonne ne dépasse JAMAIS
    const maxTtcHeaderX = margin + finalTableWidth - 5; // 5px de sécurité avant la fin du tableau
    const ttcHeaderWidth = Math.max(0, Math.min(colWidths.montantTTC, maxTtcHeaderX - colX));
    if (ttcHeaderWidth > 0) {
      doc.text('Montant TTC', colX, tableTop + 9, { width: ttcHeaderWidth, align: 'right' });
    }

    // Lignes du tableau
    let rowY = tableTop + 28;
    devis.lignes.forEach((ligne, index) => {
      const rowHeight = 30;
      const isEven = index % 2 === 0;
      
      if (isEven) {
        doc.rect(margin, rowY, finalTableWidth, rowHeight)
          .fillColor('#f9fafb')
          .fill();
      }

      colX = margin + colSpacing;
      doc.fontSize(9)
        .fillColor('#111827')
        .font('Helvetica')
        .text(ligne.designation || '', colX, rowY + 8, { width: colWidths.designation, ellipsis: true });
      
      colX += colWidths.designation + colSpacing;
      doc.text(String(ligne.quantite), colX, rowY + 8, { width: colWidths.quantite, align: 'center' });
      
      colX += colWidths.quantite + colSpacing;
      const puText = formatNumber(Number(ligne.prixUnitaire));
      doc.text(puText, colX, rowY + 8, { width: colWidths.pu, align: 'right' });
      
      colX += colWidths.pu + colSpacing;
      doc.text(
        `${Number(ligne.tauxTVA).toFixed(0)}%`,
        colX,
        rowY + 8,
        { width: colWidths.tva, align: 'center' },
      );
      
      colX += colWidths.tva + colSpacing;
      const htText = formatNumber(Number(ligne.montantHT));
      // Calculer la position max pour HT (avant TTC)
      // HT doit se terminer avant que TTC ne commence
      const ttcStartX = colX + colWidths.montantHT + colSpacing;
      const maxHtX = Math.min(margin + finalTableWidth - colWidths.montantTTC - colSpacing - 5, ttcStartX - colSpacing);
      const htColWidth = Math.max(0, Math.min(colWidths.montantHT, maxHtX - colX));
      if (htColWidth > 0) {
        doc.text(htText, colX, rowY + 8, { width: htColWidth, align: 'right', ellipsis: true });
      }
      
      colX += colWidths.montantHT + colSpacing;
      const ttcText = formatNumber(Number(ligne.montantTTC));
      // Position finale absolue : ne JAMAIS dépasser la marge droite
      // La dernière colonne doit se terminer AVANT margin + finalTableWidth
      const maxAllowedX = margin + finalTableWidth - 5; // 5px de sécurité avant la fin du tableau
      const ttcColWidth = Math.max(0, Math.min(colWidths.montantTTC, maxAllowedX - colX));
      
      // Si la colonne est trop petite, réduire le texte
      if (ttcColWidth > 0) {
        doc.font('Helvetica-Bold')
          .text(ttcText, colX, rowY + 8, { 
            width: ttcColWidth, 
            align: 'right',
            ellipsis: true 
          });
      }
      
      doc.font('Helvetica');
      rowY += rowHeight;
    });

    // Bordure du tableau - utiliser finalTableWidth
    doc.rect(margin, tableTop, finalTableWidth, rowY - tableTop)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    // ===== TOTAUX =====
    const totalsY = rowY + 20;
    const totalsLabelWidth = 120;
    const totalsValueWidth = 150;
    const totalsX = pageWidth - margin - totalsLabelWidth - totalsValueWidth - 20;

    // Total HT
    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica')
      .text('Total HT:', totalsX, totalsY, { width: totalsLabelWidth, align: 'right' });
    const totalHTText = `${formatNumber(Number(devis.totalHT))} FCFA`;
    doc.fontSize(11)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(totalHTText, totalsX + totalsLabelWidth + 10, totalsY, { width: totalsValueWidth, align: 'right' });

    // Total TVA
    const tvaY = totalsY + 20;
    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica')
      .text('Total TVA:', totalsX, tvaY, { width: totalsLabelWidth, align: 'right' });
    const totalTVAText = `${formatNumber(Number(devis.totalTVA))} FCFA`;
    doc.fontSize(11)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(totalTVAText, totalsX + totalsLabelWidth + 10, tvaY, { width: totalsValueWidth, align: 'right' });

    // Total TTC
    const ttcY = tvaY + 25;
    const ttcBoxWidth = totalsLabelWidth + totalsValueWidth + 30;
    const ttcBoxX = totalsX - 10;
    doc.rect(ttcBoxX, ttcY - 5, ttcBoxWidth, 30)
      .fillColor('#1f2937')
      .fill();
    
    doc.fontSize(12)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('Total TTC:', ttcBoxX + 10, ttcY + 5, { width: totalsLabelWidth, align: 'right' });
    
    const totalTTCText = `${formatNumber(Number(devis.totalTTC))} FCFA`;
    doc.fontSize(14)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text(totalTTCText, ttcBoxX + totalsLabelWidth + 20, ttcY + 3, { width: totalsValueWidth, align: 'right' });

    // ===== MENTIONS LÉGALES =====
    const legalY = ttcY + 50;
    
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
        'MENTIONS LÉGALES',
        margin,
        currentY,
        { width: contentWidth, align: 'center' },
      );
    
    currentY += 15;
    
    const legalText = [
      `Ce devis est valable 30 jours à compter de sa date d'émission, sauf mention contraire.`,
      `Les prix sont exprimés en FCFA et sont hors taxes sauf mention contraire.`,
      `Ce devis n'a pas de valeur contractuelle tant qu'il n'a pas été accepté par le client.`,
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
        `Document généré le ${new Date().toLocaleDateString('fr-FR')} - Devis n° ${devis.numero}`,
        margin,
        currentY,
        { width: contentWidth, align: 'center' },
      );

    // Finaliser le document
    doc.end();

    return doc;
  }
}
