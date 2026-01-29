import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ComptesBancairesService } from './comptes-bancaires.service';
import { readFileSync } from 'fs';

class CreateCompteBancaireDto {
  nom: string;
  banque?: string;
  numeroCompte?: string;
  iban?: string;
  devise?: string;
  soldeInitial?: number;
}

class CreateTransactionDto {
  date: string;
  montant: number;
  libelle: string;
  type: 'DEBIT' | 'CREDIT';
  categorie?: string;
  reference?: string;
}

@Controller('societes/:societeId/comptes-bancaires')
export class ComptesBancairesController {
  constructor(
    private readonly comptesBancairesService: ComptesBancairesService,
  ) {}

  @Get()
  list(@Param('societeId') societeId: string) {
    return this.comptesBancairesService.listBySociete(societeId);
  }

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Body() dto: CreateCompteBancaireDto,
  ) {
    return this.comptesBancairesService.createCompte(societeId, dto);
  }

  @Patch(':id')
  update(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCompteBancaireDto>,
  ) {
    return this.comptesBancairesService.updateCompte(societeId, id, dto);
  }

  @Delete(':id')
  delete(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.comptesBancairesService.deleteCompte(societeId, id);
  }

  @Get(':id/solde')
  getSolde(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.comptesBancairesService.getSolde(societeId, id);
  }

  // Transactions
  @Get(':id/transactions')
  listTransactions(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.comptesBancairesService.listTransactions(
      compteBancaireId,
      from,
      to,
    );
  }

  @Post(':id/transactions')
  createTransaction(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.comptesBancairesService.createTransaction(
      societeId,
      compteBancaireId,
      dto,
    );
  }

  @Patch(':id/transactions/:transactionId')
  updateTransaction(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @Param('transactionId') transactionId: string,
    @Body() dto: Partial<CreateTransactionDto>,
  ) {
    return this.comptesBancairesService.updateTransaction(
      societeId,
      compteBancaireId,
      transactionId,
      dto,
    );
  }

  @Delete(':id/transactions/:transactionId')
  deleteTransaction(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.comptesBancairesService.deleteTransaction(
      societeId,
      compteBancaireId,
      transactionId,
    );
  }

  // Rapprochement bancaire
  @Post(':id/transactions/:transactionId/rapprocher/recette/:recetteId')
  rapprocherAvecRecette(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @Param('transactionId') transactionId: string,
    @Param('recetteId') recetteId: string,
  ) {
    return this.comptesBancairesService.rapprocherAvecRecette(
      societeId,
      compteBancaireId,
      transactionId,
      recetteId,
    );
  }

  @Post(':id/transactions/:transactionId/rapprocher/depense/:depenseId')
  rapprocherAvecDepense(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @Param('transactionId') transactionId: string,
    @Param('depenseId') depenseId: string,
  ) {
    return this.comptesBancairesService.rapprocherAvecDepense(
      societeId,
      compteBancaireId,
      transactionId,
      depenseId,
    );
  }

  @Post(':id/transactions/:transactionId/annuler-rapprochement')
  annulerRapprochement(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.comptesBancairesService.annulerRapprochement(
      societeId,
      compteBancaireId,
      transactionId,
    );
  }

  @Get('recettes-non-rapprochees')
  getRecettesNonRapprochees(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.comptesBancairesService.getRecettesNonRapprochees(
      societeId,
      from,
      to,
    );
  }

  @Get('depenses-non-rapprochees')
  getDepensesNonRapprochees(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.comptesBancairesService.getDepensesNonRapprochees(
      societeId,
      from,
      to,
    );
  }

  // Import de relevé bancaire
  @Post(':id/import-releve')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/releves',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `releve-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['text/csv', 'text/plain', 'text/txt'];
        const allowedExts = ['.csv', '.txt', '.CSV', '.TXT'];
        const ext = extname(file.originalname);
        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Type de fichier non autorisé. Formats acceptés: CSV, TXT'), false);
        }
      },
    }),
  )
  async importReleve(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { format?: 'CSV' | 'TXT' },
  ) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    // Lire le fichier comme texte
    const fileBuffer = readFileSync(file.path);
    let fileContent = fileBuffer.toString('utf-8');
    
    // Déterminer le format en fonction du contenu, pas seulement de l'extension
    const ext = extname(file.originalname).toLowerCase();
    let format: 'CSV' | 'TXT' = 'CSV';
    
    // Détecter le format basé sur le contenu
    const firstLine = fileContent.split('\n')[0]?.trim() || '';
    const hasCommas = firstLine.includes(',');
    const hasPipes = firstLine.includes('|');
    
    if (hasPipes && !hasCommas) {
      // Le fichier utilise des pipes comme séparateurs -> format TXT
      format = 'TXT';
    } else if (hasCommas || ext === '.csv') {
      // Le fichier utilise des virgules ou a l'extension .csv -> format CSV
      format = 'CSV';
    } else {
      // Par défaut, si l'extension est .txt et qu'il n'y a pas de pipes, on essaie CSV
      format = ext === '.csv' ? 'CSV' : 'TXT';
    }
    
    console.log(`[Import] Format détecté: ${format} (extension: ${ext}, contenu: ${hasCommas ? 'virgules' : ''} ${hasPipes ? 'pipes' : ''})`);

    // Appeler le service d'import
    const result = await this.comptesBancairesService.importReleveBancaire(
      societeId,
      compteBancaireId,
      fileContent,
      format,
    );

    return result;
  }

  // Nettoyer les doublons
  @Post(':id/nettoyer-doublons')
  async nettoyerDoublons(
    @Param('societeId') societeId: string,
    @Param('id') compteBancaireId: string,
  ) {
    return this.comptesBancairesService.nettoyerDoublons(societeId, compteBancaireId);
  }
}
