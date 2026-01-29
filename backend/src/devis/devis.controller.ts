import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { DevisService } from './devis.service';
import type { Response } from 'express';

class DevisLigneDto {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA?: number;
}

class CreateDevisDto {
  clientId: string;
  date: string;
  dateValidite?: string;
  lignes: DevisLigneDto[];
}

@Controller('societes/:societeId/devis')
export class DevisController {
  constructor(private readonly devisService: DevisService) {}

  @Get()
  list(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.devisService.listBySociete(societeId, from, to);
  }

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Body() dto: CreateDevisDto,
  ) {
    return this.devisService.createForSociete(societeId, dto);
  }

  @Get(':id/pdf')
  async pdf(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const doc = await this.devisService.generatePdfStream(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="devis-${id}.pdf"`,
    );
    doc.pipe(res);
  }

  @Get(':id')
  getById(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.devisService.getById(societeId, id);
  }

  @Patch(':id/statut')
  updateStatut(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: { statut: string },
  ) {
    return this.devisService.updateStatut(societeId, id, dto.statut);
  }

  @Post(':id/convertir-facture')
  convertirEnFacture(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto?: { dateFacture?: string },
  ) {
    return this.devisService.convertirEnFacture(societeId, id, dto?.dateFacture);
  }

  @Patch(':id')
  update(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateDevisDto>,
  ) {
    return this.devisService.updateDevis(societeId, id, dto);
  }

  @Delete(':id')
  delete(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.devisService.deleteDevis(societeId, id);
  }
}
