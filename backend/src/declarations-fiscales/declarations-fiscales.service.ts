import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

export interface DeclarationISData {
  exercice: string; // "2024"
  chiffreAffaires: number;
  charges: number;
  resultatAvantImpot: number;
  resultatNet: number;
  impotSurSocietes: number;
  tauxIS: number; // Taux d'imposition (25% pour la plupart des entreprises en CI)
}

export interface DeclarationCNPSData {
  periode: string; // "2024-01"
  nombreSalaries: number;
  masseSalarialeBrute: number;
  cotisationsSalariales: number;
  cotisationsPatronales: number;
  totalCotisations: number;
}

export interface DeclarationRetenueSourceData {
  periode: string; // "2024-01"
  montantBrut: number;
  tauxRetenue: number;
  montantRetenu: number;
  nombreBeneficiaires: number;
}

@Injectable()
export class DeclarationsFiscalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Génère automatiquement une déclaration fiscale selon le type
   */
  async genererDeclaration(
    societeId: string,
    type: 'TVA' | 'IS' | 'CNPS' | 'RETENUE_SOURCE',
    periode: string,
  ) {
    const societe = await this.prisma.societe.findUnique({ where: { id: societeId } });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    // Vérifier si une déclaration existe déjà pour cette période
    const existante = await this.prisma.declarationFiscale.findFirst({
      where: {
        societeId,
        type,
        periode,
      },
    });

    if (existante) {
      throw new BadRequestException(
        `Une déclaration ${type} existe déjà pour la période ${periode}`,
      );
    }

    let donnees: any;

    switch (type) {
      case 'TVA':
        donnees = await this.genererDonneesTVA(societeId, periode);
        break;
      case 'IS':
        donnees = await this.genererDonneesIS(societeId, periode);
        break;
      case 'CNPS':
        donnees = await this.genererDonneesCNPS(societeId, periode);
        break;
      case 'RETENUE_SOURCE':
        donnees = await this.genererDonneesRetenueSource(societeId, periode);
        break;
      default:
        throw new BadRequestException(`Type de déclaration non supporté: ${type}`);
    }

    // Valider les données avant création
    const erreurs = await this.validerDonnees(type, donnees);
    if (erreurs.length > 0 && erreurs.some((e) => e.severite === 'ERREUR')) {
      throw new BadRequestException(
        `Erreurs de validation: ${erreurs.map((e) => e.message).join(', ')}`,
      );
    }

    const declaration = await this.prisma.declarationFiscale.create({
      data: {
        societeId,
        type,
        periode,
        donnees,
        statut: erreurs.length > 0 ? 'BROUILLON' : 'BROUILLON',
        erreurs: erreurs.length > 0 ? erreurs : undefined,
      },
    });

    // Lier avec l'échéance fiscale correspondante si elle existe
    await this.lierAvecEcheance(societeId, type, periode, declaration.id);

    return declaration;
  }

  /**
   * Génère les données pour une déclaration TVA
   */
  private async genererDonneesTVA(societeId: string, periode: string) {
    const [year, month] = periode.split('-').map(Number);
    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0);
    toDate.setHours(23, 59, 59, 999);

    // Utiliser la logique existante de DeclarationTvaService
    const compteTVACollectee = await this.prisma.compteComptable.findUnique({
      where: { code: '4451' },
    });
    const compteTVADeductible = await this.prisma.compteComptable.findUnique({
      where: { code: '4452' },
    });

    if (!compteTVACollectee || !compteTVADeductible) {
      throw new Error('Comptes TVA manquants. Veuillez initialiser le plan comptable.');
    }

    const ecrituresTVACollectee = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        compteCreditId: compteTVACollectee.id,
        date: { gte: fromDate, lte: toDate },
      },
    });

    const ecrituresTVADeductible = await this.prisma.ecritureComptable.findMany({
      where: {
        societeId,
        compteDebitId: compteTVADeductible.id,
        date: { gte: fromDate, lte: toDate },
      },
    });

    const tvaCollectee = ecrituresTVACollectee.reduce(
      (sum, e) => sum + Number(e.montant),
      0,
    );
    const tvaDeductible = ecrituresTVADeductible.reduce(
      (sum, e) => sum + Number(e.montant),
      0,
    );
    const tvaAPayer = Math.max(0, tvaCollectee - tvaDeductible);

    return {
      tvaCollectee,
      tvaDeductible,
      tvaAPayer,
      periode,
    };
  }

  /**
   * Génère les données pour une déclaration IS (Impôt sur les Sociétés)
   */
  private async genererDonneesIS(societeId: string, periode: string): Promise<DeclarationISData> {
    const annee = parseInt(periode, 10);
    const fromDate = new Date(annee, 0, 1);
    const toDate = new Date(annee, 11, 31, 23, 59, 59, 999);

    // Chiffre d'affaires (compte 707)
    const compteVentes = await this.prisma.compteComptable.findUnique({
      where: { code: '707' },
    });
    let chiffreAffaires = 0;
    if (compteVentes) {
      const ecrituresVentes = await this.prisma.ecritureComptable.findMany({
        where: {
          societeId,
          compteCreditId: compteVentes.id,
          date: { gte: fromDate, lte: toDate },
        },
      });
      chiffreAffaires = ecrituresVentes.reduce((sum, e) => sum + Number(e.montant), 0);
    }

    // Charges (comptes 6xx)
    const comptesCharges = await this.prisma.compteComptable.findMany({
      where: {
        code: { startsWith: '6' },
      },
    });
    let charges = 0;
    for (const compte of comptesCharges) {
      const ecritures = await this.prisma.ecritureComptable.findMany({
        where: {
          societeId,
          compteDebitId: compte.id,
          date: { gte: fromDate, lte: toDate },
        },
      });
      charges += ecritures.reduce((sum, e) => sum + Number(e.montant), 0);
    }

    const resultatAvantImpot = chiffreAffaires - charges;
    const tauxIS = 0.25; // 25% pour la plupart des entreprises en Côte d'Ivoire
    const impotSurSocietes = Math.max(0, resultatAvantImpot * tauxIS);
    const resultatNet = resultatAvantImpot - impotSurSocietes;

    return {
      exercice: periode,
      chiffreAffaires,
      charges,
      resultatAvantImpot,
      resultatNet,
      impotSurSocietes,
      tauxIS,
    };
  }

  /**
   * Génère les données pour une déclaration CNPS
   * Note: Nécessite un modèle Salarie pour un calcul précis
   */
  private async genererDonneesCNPS(
    societeId: string,
    periode: string,
  ): Promise<DeclarationCNPSData> {
    // Pour l'instant, retourner des données vides car on n'a pas de modèle Salarie
    // À améliorer quand on aura un module de paie
    return {
      periode,
      nombreSalaries: 0,
      masseSalarialeBrute: 0,
      cotisationsSalariales: 0,
      cotisationsPatronales: 0,
      totalCotisations: 0,
    };
  }

  /**
   * Génère les données pour une déclaration de retenue à la source
   */
  private async genererDonneesRetenueSource(
    societeId: string,
    periode: string,
  ): Promise<DeclarationRetenueSourceData> {
    // Pour l'instant, retourner des données vides
    // À améliorer quand on aura un module de paie ou de gestion des prestations
    return {
      periode,
      montantBrut: 0,
      tauxRetenue: 0.1, // 10% par défaut
      montantRetenu: 0,
      nombreBeneficiaires: 0,
    };
  }

  /**
   * Valide les données d'une déclaration avant envoi
   */
  private async validerDonnees(
    type: string,
    donnees: any,
  ): Promise<Array<{ message: string; severite: 'ERREUR' | 'AVERTISSEMENT' }>> {
    const erreurs: Array<{ message: string; severite: 'ERREUR' | 'AVERTISSEMENT' }> = [];

    switch (type) {
      case 'TVA':
        if (donnees.tvaCollectee < 0) {
          erreurs.push({
            message: 'La TVA collectée ne peut pas être négative',
            severite: 'ERREUR',
          });
        }
        if (donnees.tvaDeductible < 0) {
          erreurs.push({
            message: 'La TVA déductible ne peut pas être négative',
            severite: 'ERREUR',
          });
        }
        break;

      case 'IS':
        if (donnees.chiffreAffaires < 0) {
          erreurs.push({
            message: 'Le chiffre d\'affaires ne peut pas être négatif',
            severite: 'ERREUR',
          });
        }
        if (donnees.impotSurSocietes < 0) {
          erreurs.push({
            message: 'L\'impôt sur les sociétés ne peut pas être négatif',
            severite: 'ERREUR',
          });
        }
        break;

      case 'CNPS':
        if (donnees.nombreSalaries === 0 && donnees.masseSalarialeBrute > 0) {
          erreurs.push({
            message: 'Incohérence: masse salariale sans salariés',
            severite: 'AVERTISSEMENT',
          });
        }
        break;
    }

    return erreurs;
  }

  /**
   * Lie une déclaration avec son échéance fiscale correspondante
   */
  private async lierAvecEcheance(
    societeId: string,
    type: string,
    periode: string,
    declarationId: string,
  ): Promise<void> {
    const echeance = await this.prisma.echeanceFiscale.findFirst({
      where: {
        societeId,
        type,
        periode,
      },
    });

    if (echeance && type === 'TVA') {
      await this.prisma.echeanceFiscale.update({
        where: { id: echeance.id },
        data: { declarationTVAId: declarationId },
      });
    }
  }

  /**
   * Récupère toutes les déclarations d'une société avec filtres
   */
  async getDeclarations(
    societeId: string,
    filters?: {
      type?: string;
      statut?: string;
      periode?: string;
    },
  ) {
    const where: any = { societeId };
    if (filters?.type) where.type = filters.type;
    if (filters?.statut) where.statut = filters.statut;
    if (filters?.periode) where.periode = filters.periode;

    return this.prisma.declarationFiscale.findMany({
      where,
      orderBy: { dateDeclaration: 'desc' },
    });
  }

  /**
   * Met à jour le statut d'une déclaration
   */
  async updateStatut(
    societeId: string,
    declarationId: string,
    statut: string,
    referenceDGI?: string,
  ) {
    const declaration = await this.prisma.declarationFiscale.findFirst({
      where: { id: declarationId, societeId },
    });
    if (!declaration) {
      throw new NotFoundException('Déclaration introuvable');
    }

    return this.prisma.declarationFiscale.update({
      where: { id: declarationId },
      data: {
        statut,
        referenceDGI,
        dateValidation: statut === 'VALIDEE' ? new Date() : null,
      },
    });
  }

  /**
   * Génère un PDF pour une déclaration fiscale
   */
  async generatePdfBuffer(societeId: string, declarationId: string): Promise<Buffer> {
    const declaration = await this.prisma.declarationFiscale.findFirst({
      where: { id: declarationId, societeId },
      include: { societe: true },
    });

    if (!declaration) {
      throw new NotFoundException('Déclaration introuvable');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(20).text(`Déclaration ${declaration.type}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Société: ${declaration.societe.nom}`, { align: 'center' });
      doc.text(`Période: ${declaration.periode}`, { align: 'center' });
      doc.text(`Date de déclaration: ${new Date(declaration.dateDeclaration).toLocaleDateString('fr-FR')}`, { align: 'center' });
      doc.moveDown();

      // Contenu selon le type
      const donnees = declaration.donnees as any;
      doc.fontSize(14).text('Détails:', { underline: true });
      doc.moveDown();

      switch (declaration.type) {
        case 'TVA':
          doc.text(`TVA collectée: ${Number(donnees.tvaCollectee || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`TVA déductible: ${Number(donnees.tvaDeductible || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`TVA à payer: ${Number(donnees.tvaAPayer || 0).toLocaleString('fr-FR')} FCFA`);
          break;
        case 'IS':
          doc.text(`Chiffre d'affaires: ${Number(donnees.chiffreAffaires || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Charges: ${Number(donnees.charges || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Résultat avant impôt: ${Number(donnees.resultatAvantImpot || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Taux IS: ${(donnees.tauxIS * 100).toFixed(2)}%`);
          doc.text(`Impôt sur les sociétés: ${Number(donnees.impotSurSocietes || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Résultat net: ${Number(donnees.resultatNet || 0).toLocaleString('fr-FR')} FCFA`);
          break;
        case 'CNPS':
          doc.text(`Nombre de salariés: ${donnees.nombreSalaries || 0}`);
          doc.text(`Masse salariale brute: ${Number(donnees.masseSalarialeBrute || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Cotisations salariales: ${Number(donnees.cotisationsSalariales || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Cotisations patronales: ${Number(donnees.cotisationsPatronales || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Total cotisations: ${Number(donnees.totalCotisations || 0).toLocaleString('fr-FR')} FCFA`);
          break;
        case 'RETENUE_SOURCE':
          doc.text(`Montant brut: ${Number(donnees.montantBrut || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Taux de retenue: ${(donnees.tauxRetenue * 100).toFixed(2)}%`);
          doc.text(`Montant retenu: ${Number(donnees.montantRetenu || 0).toLocaleString('fr-FR')} FCFA`);
          doc.text(`Nombre de bénéficiaires: ${donnees.nombreBeneficiaires || 0}`);
          break;
      }

      doc.moveDown();
      doc.fontSize(10).text(`Statut: ${declaration.statut}`, { align: 'right' });
      if (declaration.referenceDGI) {
        doc.text(`Référence DGI: ${declaration.referenceDGI}`, { align: 'right' });
      }

      doc.end();
    });
  }
}
