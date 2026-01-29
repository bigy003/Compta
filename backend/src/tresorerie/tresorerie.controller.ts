import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TresorerieService } from './tresorerie.service';

class MouvementDto {
  date: string;
  montant: number;
  description?: string;
}

@Controller('societes/:societeId')
export class TresorerieController {
  constructor(private readonly tresorerieService: TresorerieService) {}

  @Get('recettes')
  listRecettes(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.tresorerieService.listRecettes(societeId, from, to);
  }

  @Post('recettes')
  createRecette(
    @Param('societeId') societeId: string,
    @Body() dto: MouvementDto,
  ) {
    return this.tresorerieService.createRecette(societeId, dto);
  }

  @Get('depenses')
  listDepenses(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.tresorerieService.listDepenses(societeId, from, to);
  }

  @Post('depenses')
  createDepense(
    @Param('societeId') societeId: string,
    @Body() dto: MouvementDto,
  ) {
    return this.tresorerieService.createDepense(societeId, dto);
  }

  @Get('dashboard')
  dashboard(
    @Param('societeId') societeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.tresorerieService.getDashboard(societeId, from, to);
  }

  @Get('dashboard/graphique')
  graphique(
    @Param('societeId') societeId: string,
    @Query('months') months?: string,
  ) {
    return this.tresorerieService.getDashboardGraphique(
      societeId,
      months ? parseInt(months) : 6,
    );
  }

  @Get('dashboard/alertes')
  alertes(
    @Param('societeId') societeId: string,
    @Query('joursRetard') joursRetard?: string,
  ) {
    return this.tresorerieService.getFacturesImpayees(
      societeId,
      joursRetard ? parseInt(joursRetard) : 30,
    );
  }
}

