import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PlanComptableService } from './plan-comptable.service';

class CreateEcritureDto {
  compteDebitId: string;
  compteCreditId: string;
  date: string;
  montant: number;
  libelle: string;
  pieceJustificative?: string;
  journal?: string;
}

@Controller('plan-comptable')
export class PlanComptableController {
  constructor(
    private readonly planComptableService: PlanComptableService,
  ) {}

  @Post('initialize')
  initialize() {
    return this.planComptableService.initializePlanComptable();
  }

  @Get('comptes')
  listComptes(
    @Query('classe') classe?: string,
    @Query('search') search?: string,
  ) {
    return this.planComptableService.listComptes(
      classe ? parseInt(classe) : undefined,
      search,
    );
  }

  @Get('comptes/:code')
  getCompteByCode(@Param('code') code: string) {
    return this.planComptableService.getCompteByCode(code);
  }

  @Get('societes/:societeId/ecritures')
  listEcritures(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('exerciceId') exerciceId?: string,
  ) {
    return this.planComptableService.listEcritures(societeId, from, to, exerciceId);
  }

  @Post('societes/:societeId/ecritures')
  createEcriture(
    @Param('societeId') societeId: string,
    @Body() dto: CreateEcritureDto,
  ) {
    return this.planComptableService.createEcriture(societeId, dto);
  }

  @Get('societes/:societeId/comptes/:compteId/solde')
  getSoldeCompte(
    @Param('societeId') societeId: string,
    @Param('compteId') compteId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.planComptableService.getSoldeCompte(
      societeId,
      compteId,
      from,
      to,
    );
  }
}
