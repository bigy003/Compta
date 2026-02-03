import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { DevisesService } from './devises.service';

@Controller('devises')
export class DevisesController {
  constructor(private readonly devisesService: DevisesService) {}

  /**
   * Récupère toutes les devises actives
   */
  @Get()
  async getAllDevises() {
    return this.devisesService.getAllDevises();
  }

  /**
   * Récupère une devise par son code
   */
  @Get(':code')
  async getDeviseByCode(@Param('code') code: string) {
    return this.devisesService.getDeviseByCode(code);
  }

  /**
   * Récupère le taux de change actuel pour une devise
   */
  @Get(':code/taux-actuel')
  async getTauxActuel(@Param('code') code: string) {
    const taux = await this.devisesService.getTauxChangeActuel(code);
    return { code, taux };
  }

  /**
   * Récupère l'historique des taux de change
   */
  @Get(':code/historique')
  async getHistorique(
    @Param('code') code: string,
    @Query('jours') jours?: string,
  ) {
    const joursNum = jours ? parseInt(jours, 10) : 30;
    return this.devisesService.getHistoriqueTaux(code, joursNum);
  }

  /**
   * Met à jour le taux de change pour une devise
   */
  @Post(':code/taux')
  async mettreAJourTaux(
    @Param('code') code: string,
    @Body() body: { taux: number; source?: string },
  ) {
    await this.devisesService.mettreAJourTauxChange(
      code,
      body.taux,
      body.source || 'MANUEL',
    );
    return { message: 'Taux de change mis à jour avec succès' };
  }

  /**
   * Convertit un montant d'une devise vers XOF
   */
  @Post('convertir-vers-xof')
  async convertirVersXOF(
    @Body() body: { montant: number; devise: string },
  ) {
    const montantXOF = await this.devisesService.convertirVersXOF(
      body.montant,
      body.devise,
    );
    return {
      montantSource: body.montant,
      deviseSource: body.devise,
      montantXOF,
      deviseCible: 'XOF',
    };
  }

  /**
   * Convertit un montant de XOF vers une autre devise
   */
  @Post('convertir-de-xof')
  async convertirDeXOF(
    @Body() body: { montant: number; devise: string },
  ) {
    const montantConverti = await this.devisesService.convertirDeXOF(
      body.montant,
      body.devise,
    );
    return {
      montantXOF: body.montant,
      deviseSource: 'XOF',
      montantConverti,
      deviseCible: body.devise,
    };
  }

  /**
   * Convertit un montant d'une devise vers une autre
   */
  @Post('convertir')
  async convertir(
    @Body() body: { montant: number; deviseSource: string; deviseCible: string },
  ) {
    const montantConverti = await this.devisesService.convertir(
      body.montant,
      body.deviseSource,
      body.deviseCible,
    );
    return {
      montantSource: body.montant,
      deviseSource: body.deviseSource,
      montantConverti,
      deviseCible: body.deviseCible,
    };
  }
}
