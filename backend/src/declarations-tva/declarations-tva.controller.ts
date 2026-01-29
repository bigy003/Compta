import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { DeclarationsTvaService } from './declarations-tva.service';
import type { Response } from 'express';

class CreateDeclarationDto {
  periode: string; // Format: "YYYY-MM"
}

@Controller('societes/:societeId/declarations-tva')
export class DeclarationsTvaController {
  constructor(
    private readonly declarationsTvaService: DeclarationsTvaService,
  ) {}

  @Get()
  list(@Param('societeId') societeId: string) {
    return this.declarationsTvaService.listBySociete(societeId);
  }

  @Get('calculer/:periode')
  calculate(
    @Param('societeId') societeId: string,
    @Param('periode') periode: string,
  ) {
    return this.declarationsTvaService.calculateTVA(societeId, periode);
  }

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Body() dto: CreateDeclarationDto,
  ) {
    return this.declarationsTvaService.createOrUpdate(societeId, dto);
  }

  @Get(':id')
  getById(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.declarationsTvaService.getById(societeId, id);
  }

  @Patch(':id/statut')
  updateStatut(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: { statut: string },
  ) {
    return this.declarationsTvaService.updateStatut(societeId, id, dto.statut);
  }

  @Post(':id/recalculer')
  recalculate(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.declarationsTvaService.recalculate(societeId, id);
  }

  @Get(':id/pdf')
  async getPdf(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.declarationsTvaService.generatePdfBuffer(societeId, id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="declaration-tva-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }
}
