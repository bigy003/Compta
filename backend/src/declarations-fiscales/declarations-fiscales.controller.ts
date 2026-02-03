import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DeclarationsFiscalesService } from './declarations-fiscales.service';

@Controller('societes/:societeId/declarations-fiscales')
export class DeclarationsFiscalesController {
  constructor(
    private readonly declarationsFiscalesService: DeclarationsFiscalesService,
  ) {}

  /**
   * Génère automatiquement une déclaration fiscale
   */
  @Post('generer')
  async genererDeclaration(
    @Param('societeId') societeId: string,
    @Body() body: { type: 'TVA' | 'IS' | 'CNPS' | 'RETENUE_SOURCE'; periode: string },
  ) {
    return this.declarationsFiscalesService.genererDeclaration(
      societeId,
      body.type,
      body.periode,
    );
  }

  /**
   * Récupère toutes les déclarations avec filtres
   */
  @Get()
  async getDeclarations(
    @Param('societeId') societeId: string,
    @Query('type') type?: string,
    @Query('statut') statut?: string,
    @Query('periode') periode?: string,
  ) {
    return this.declarationsFiscalesService.getDeclarations(societeId, {
      type,
      statut,
      periode,
    });
  }

  /**
   * Met à jour le statut d'une déclaration
   */
  @Patch(':id/statut')
  async updateStatut(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() body: { statut: string; referenceDGI?: string },
  ) {
    return this.declarationsFiscalesService.updateStatut(
      societeId,
      id,
      body.statut,
      body.referenceDGI,
    );
  }

  /**
   * Génère et télécharge le PDF d'une déclaration
   */
  @Get(':id/pdf')
  async getPdf(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.declarationsFiscalesService.generatePdfBuffer(
      societeId,
      id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="declaration-${id}.pdf"`);
    res.send(pdfBuffer);
  }
}
