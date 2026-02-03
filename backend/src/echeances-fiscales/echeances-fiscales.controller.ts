import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { EcheancesFiscalesService } from './echeances-fiscales.service';

@Controller('societes/:societeId/echeances-fiscales')
export class EcheancesFiscalesController {
  constructor(
    private readonly echeancesFiscalesService: EcheancesFiscalesService,
  ) {}

  /**
   * Génère les échéances fiscales pour une année donnée
   */
  @Post('generer/:annee')
  async genererEcheances(
    @Param('societeId') societeId: string,
    @Param('annee') annee: string,
  ) {
    await this.echeancesFiscalesService.genererEcheancesAnnuelles(
      societeId,
      parseInt(annee, 10),
    );
    return { message: 'Échéances générées avec succès' };
  }

  /**
   * Récupère toutes les échéances avec filtres optionnels
   */
  @Get()
  async getEcheances(
    @Param('societeId') societeId: string,
    @Query('type') type?: string,
    @Query('statut') statut?: string,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.echeancesFiscalesService.getEcheances(societeId, {
      type,
      statut,
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
    });
  }

  /**
   * Récupère les échéances nécessitant des rappels
   */
  @Get('rappels')
  async getEcheancesPourRappel(@Param('societeId') societeId: string) {
    return this.echeancesFiscalesService.getEcheancesPourRappel(societeId);
  }

  /**
   * Met à jour le statut d'une échéance
   */
  @Patch(':id/statut')
  async updateStatut(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body()
    body: {
      statut: string;
      dateRealisation?: string;
      reference?: string;
    },
  ) {
    return this.echeancesFiscalesService.updateStatut(
      societeId,
      id,
      body.statut,
      body.dateRealisation ? new Date(body.dateRealisation) : undefined,
      body.reference,
    );
  }

  /**
   * Met à jour les montants estimés pour les échéances TVA
   */
  @Post('mettre-a-jour-montants')
  async mettreAJourMontants(@Param('societeId') societeId: string) {
    await this.echeancesFiscalesService.mettreAJourMontantsEstimes(societeId);
    return { message: 'Montants estimés mis à jour' };
  }

  /**
   * Met à jour les statuts (A_FAIRE → EN_RETARD si dépassé)
   */
  @Post('mettre-a-jour-statuts')
  async mettreAJourStatuts(@Param('societeId') societeId: string) {
    await this.echeancesFiscalesService.mettreAJourStatuts(societeId);
    return { message: 'Statuts mis à jour' };
  }

  /**
   * Marque un rappel comme envoyé
   */
  @Post(':id/rappel-envoye')
  async marquerRappelEnvoye(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() body: { typeRappel: 'rappel7Jours' | 'rappel3Jours' | 'rappelJourJ' | 'rappelRetard' },
  ) {
    await this.echeancesFiscalesService.marquerRappelEnvoye(
      societeId,
      id,
      body.typeRappel,
    );
    return { message: 'Rappel marqué comme envoyé' };
  }
}
