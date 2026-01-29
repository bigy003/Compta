import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import {
  RapprochementAvanceService,
  MatchingResult,
} from './rapprochement-avance.service';

@Controller('societes/:societeId/rapprochement-avance')
export class RapprochementAvanceController {
  constructor(
    private readonly rapprochementAvanceService: RapprochementAvanceService,
  ) {}

  @Get('correspondances-automatiques')
  async trouverCorrespondances(
    @Param('societeId') societeId: string,
    @Query('compteBancaireId') compteBancaireId?: string,
  ) {
    return this.rapprochementAvanceService.trouverCorrespondancesAutomatiques(
      societeId,
      compteBancaireId,
    );
  }

  @Post('creer-rapprochement')
  async creerRapprochement(
    @Param('societeId') societeId: string,
    @Body()
    body: {
      transactionId: string;
      factureId: string;
      paiementId?: string;
    },
  ) {
    return this.rapprochementAvanceService.creerRapprochementAutomatique(
      societeId,
      body.transactionId,
      body.factureId,
      body.paiementId,
    );
  }

  @Post(':id/valider')
  async validerRapprochement(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.rapprochementAvanceService.validerRapprochement(
      societeId,
      id,
    );
  }

  @Post(':id/rejeter')
  async rejeterRapprochement(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.rapprochementAvanceService.rejeterRapprochement(societeId, id);
  }

  @Get('en-attente')
  async listEnAttente(@Param('societeId') societeId: string) {
    return this.rapprochementAvanceService.listRapprochementsEnAttente(
      societeId,
    );
  }

  @Get()
  async listRapprochements(
    @Param('societeId') societeId: string,
    @Query('statut') statut?: string,
    @Query('factureId') factureId?: string,
  ) {
    return this.rapprochementAvanceService.listRapprochements(societeId, {
      statut,
      factureId,
    });
  }
}
