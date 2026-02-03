import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { AlertesService } from './alertes.service';

@Controller('societes/:societeId/alertes')
export class AlertesController {
  constructor(private readonly alertesService: AlertesService) {}

  /**
   * Génère toutes les alertes pour une société
   */
  @Post('generer')
  async genererAlertes(@Param('societeId') societeId: string) {
    await this.alertesService.genererAlertes(societeId);
    return { message: 'Alertes générées avec succès' };
  }

  /**
   * Récupère toutes les alertes avec filtres
   */
  @Get()
  async getAlertes(
    @Param('societeId') societeId: string,
    @Query('userId') userId?: string,
    @Query('statut') statut?: string,
    @Query('type') type?: string,
    @Query('severite') severite?: string,
    @Query('nonLuesSeulement') nonLuesSeulement?: string,
  ) {
    return this.alertesService.getAlertes(societeId, userId, {
      statut,
      type,
      severite,
      nonLuesSeulement: nonLuesSeulement === 'true',
    });
  }

  /**
   * Récupère le nombre d'alertes non lues
   */
  @Get('nombre-non-lues')
  async getNombreNonLues(
    @Param('societeId') societeId: string,
    @Query('userId') userId?: string,
  ) {
    const nombre = await this.alertesService.getNombreAlertesNonLues(
      societeId,
      userId,
    );
    return { nombre };
  }

  /**
   * Marque une alerte comme lue
   */
  @Patch(':id/lue')
  async marquerCommeLue(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    await this.alertesService.marquerCommeLue(societeId, id, userId);
    return { message: 'Alerte marquée comme lue' };
  }

  /**
   * Marque une alerte comme ignorée
   */
  @Patch(':id/ignorer')
  async ignorer(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    await this.alertesService.ignorer(societeId, id, userId);
    return { message: 'Alerte ignorée' };
  }

  /**
   * Marque une alerte comme résolue
   */
  @Patch(':id/resoudre')
  async resoudre(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    await this.alertesService.resoudre(societeId, id, userId);
    return { message: 'Alerte résolue' };
  }

  /**
   * Marque toutes les alertes comme lues
   */
  @Post('marquer-toutes-lues')
  async marquerToutesCommeLues(
    @Param('societeId') societeId: string,
    @Query('userId') userId?: string,
  ) {
    await this.alertesService.marquerToutesCommeLues(societeId, userId);
    return { message: 'Toutes les alertes marquées comme lues' };
  }
}
