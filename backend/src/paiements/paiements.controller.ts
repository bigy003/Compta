import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';

class CreatePaiementDto {
  date: string;
  montant: number;
  methode: string;
  reference?: string;
  notes?: string;
}

@Controller('societes/:societeId/factures/:factureId/paiements')
export class PaiementsController {
  constructor(private readonly paiementsService: PaiementsService) {}

  @Get()
  list(
    @Param('societeId') societeId: string,
    @Param('factureId') factureId: string,
  ) {
    return this.paiementsService.listByFacture(societeId, factureId);
  }

  @Get('historique')
  getHistorique(
    @Param('societeId') societeId: string,
    @Param('factureId') factureId: string,
  ) {
    return this.paiementsService.getHistoriquePaiements(societeId, factureId);
  }

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Param('factureId') factureId: string,
    @Body() dto: CreatePaiementDto,
  ) {
    return this.paiementsService.createPaiement(societeId, factureId, dto);
  }

  @Delete(':id')
  delete(
    @Param('societeId') societeId: string,
    @Param('factureId') factureId: string,
    @Param('id') id: string,
  ) {
    return this.paiementsService.deletePaiement(societeId, factureId, id);
  }
}
