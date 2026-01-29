import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { FacturesService } from './factures.service';
import type { Response } from 'express';

class FactureLigneDto {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA?: number;
}

class CreateFactureDto {
  clientId: string;
  date: string;
  lignes: FactureLigneDto[];
}

@Controller('societes/:societeId/factures')
export class FacturesController {
  constructor(private readonly facturesService: FacturesService) {}

  @Get()
  list(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.facturesService.listBySociete(societeId, from, to);
  }

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Body() dto: CreateFactureDto,
  ) {
    return this.facturesService.createForSociete(societeId, dto);
  }

  @Get(':id')
  getById(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.facturesService.getById(societeId, id);
  }

  @Patch(':id')
  update(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateFactureDto>,
  ) {
    return this.facturesService.updateFacture(societeId, id, dto);
  }

  @Patch(':id/statut')
  updateStatut(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: { statut: string },
  ) {
    return this.facturesService.updateStatut(societeId, id, dto.statut);
  }

  @Get(':id/pdf')
  async pdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const doc = await this.facturesService.generatePdfStream(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="facture-${id}.pdf"`,
    );
    doc.pipe(res);
  }

  @Post(':id/send-email')
  async sendEmail(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: { email?: string },
  ) {
    await this.facturesService.sendInvoiceByEmail(societeId, id, dto.email);
    return { message: 'Facture envoyée par email avec succès' };
  }
}

