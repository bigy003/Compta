import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BanqueService } from './banque.service';
import { EcartsService } from './rapprochement/ecarts.service';
import { RapprochementComptableService } from './rapprochement/rapprochement-comptable.service';
import { LettrageAutomatiqueService } from './rapprochement/lettrage-automatique.service';
import { ImportMultiFormatsService } from './import/import-multi-formats.service';
import { BanquesIvoireService } from './referentiel/banques-ivoire.service';

@Controller('societes/:societeId/banque')
export class BanqueController {
  constructor(
    private readonly banqueService: BanqueService,
    private readonly ecartsService: EcartsService,
    private readonly rapprochementService: RapprochementComptableService,
    private readonly lettrageService: LettrageAutomatiqueService,
    private readonly importService: ImportMultiFormatsService,
    private readonly banquesService: BanquesIvoireService,
  ) {}

  /**
   * Récupère les transactions d'un compte bancaire
   */
  @Get('comptes/:compteId/transactions')
  async getTransactions(
    @Param('societeId') societeId: string,
    @Param('compteId') compteId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('rapproche') rapproche?: string,
    @Query('type') type?: string,
    @Query('categorie') categorie?: string,
    @Query('search') search?: string,
  ) {
    return this.banqueService.getTransactions(societeId, compteId, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      rapproche: rapproche === 'true' ? true : rapproche === 'false' ? false : undefined,
      type: type as 'DEBIT' | 'CREDIT' | undefined,
      categorie,
      search,
    });
  }

  /**
   * Récupère les indicateurs d'un compte bancaire
   */
  @Get('comptes/:compteId/indicateurs')
  async getIndicateurs(
    @Param('societeId') societeId: string,
    @Param('compteId') compteId: string,
    @Query('date') date?: string,
  ) {
    return this.banqueService.getIndicateurs(
      societeId,
      compteId,
      date ? new Date(date) : undefined,
    );
  }

  /**
   * Applique le lettrage automatique
   */
  @Post('comptes/:compteId/lettrage-automatique')
  async appliquerLettrageAutomatique(
    @Param('societeId') societeId: string,
    @Param('compteId') compteId: string,
  ) {
    return this.banqueService.appliquerLettrageAutomatique(societeId, compteId);
  }

  /**
   * Détecte les écarts de rapprochement
   */
  @Post('comptes/:compteId/detecter-ecarts')
  async detecterEcarts(
    @Param('societeId') societeId: string,
    @Param('compteId') compteId: string,
    @Body() body?: { date?: string },
  ) {
    return this.banqueService.detecterEtCreerEcarts(
      societeId,
      compteId,
      body?.date ? new Date(body.date) : undefined,
    );
  }

  /**
   * Récupère les écarts non résolus
   */
  @Get('ecarts')
  async getEcarts(
    @Param('societeId') societeId: string,
    @Query('compteId') compteId?: string,
  ) {
    return this.ecartsService.getEcartsNonResolus(societeId, compteId);
  }

  /**
   * Marque un écart comme résolu
   */
  @Post('ecarts/:ecartId/resoudre')
  async resoudreEcart(@Param('ecartId') ecartId: string) {
    await this.ecartsService.resoudreEcart(ecartId);
    return { message: 'Écart marqué comme résolu' };
  }

  /**
   * Récupère les écritures potentielles pour une transaction
   */
  @Get('transactions/:transactionId/ecritures-potentielles')
  async getEcrituresPotentielles(
    @Param('societeId') societeId: string,
    @Param('transactionId') transactionId: string,
    @Query('toleranceJours') toleranceJours?: string,
  ) {
    return this.rapprochementService.trouverEcrituresPotentielles(
      societeId,
      transactionId,
      toleranceJours ? parseInt(toleranceJours, 10) : 7,
    );
  }

  /**
   * Crée un rapprochement comptable
   */
  @Post('rapprochements-comptables')
  async creerRapprochement(
    @Param('societeId') societeId: string,
    @Body()
    body: {
      transactionBancaireId: string;
      ecritureComptableId?: string;
      compteComptableId?: string;
      scoreConfiance?: number;
      notes?: string;
    },
  ) {
    return this.rapprochementService.creerRapprochement(
      societeId,
      body.transactionBancaireId,
      body.ecritureComptableId,
      body.compteComptableId,
      body.scoreConfiance,
      body.notes,
    );
  }

  /**
   * Valide un rapprochement comptable
   */
  @Post('rapprochements-comptables/:id/valider')
  async validerRapprochement(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.rapprochementService.validerRapprochement(societeId, id);
  }

  /**
   * Rejette un rapprochement comptable
   */
  @Post('rapprochements-comptables/:id/rejeter')
  async rejeterRapprochement(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.rapprochementService.rejeterRapprochement(societeId, id);
  }

  /**
   * Liste les rapprochements comptables
   */
  @Get('rapprochements-comptables')
  async getRapprochements(
    @Param('societeId') societeId: string,
    @Query('statut') statut?: string,
    @Query('compteId') compteId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.rapprochementService.getRapprochements(societeId, {
      statut,
      compteBancaireId: compteId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  /**
   * Import CSV
   */
  @Post('comptes/:compteId/import/csv')
  async importCSV(
    @Param('compteId') compteId: string,
    @Body() body: { content: string; formatBanque?: string },
  ) {
    return this.importService.importerCSV(
      compteId,
      body.content,
      body.formatBanque,
    );
  }

  /**
   * Import Excel
   */
  @Post('comptes/:compteId/import/excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @Param('compteId') compteId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('Fichier Excel requis');
    }

    // Sauvegarder temporairement le fichier
    const fs = require('fs');
    const path = require('path');
    const tempPath = path.join(__dirname, '../../temp', file.originalname);
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, file.buffer);

    try {
      const result = await this.importService.importerExcel(compteId, tempPath);
      // Supprimer le fichier temporaire
      fs.unlinkSync(tempPath);
      return result;
    } catch (error) {
      // Supprimer le fichier temporaire même en cas d'erreur
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  /**
   * Import OFX
   */
  @Post('comptes/:compteId/import/ofx')
  async importOFX(
    @Param('compteId') compteId: string,
    @Body() body: { content: string },
  ) {
    return this.importService.importerOFX(compteId, body.content);
  }

  /**
   * Liste les banques ivoiriennes
   */
  @Get('banques-ivoire')
  async getBanquesIvoire() {
    return this.banquesService.getAllBanques();
  }
}
