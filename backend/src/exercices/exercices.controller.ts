import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ExercicesService } from './exercices.service';

class CreateExerciceDto {
  annee: number;
  dateDebut: string;
  dateFin: string;
}

@Controller('societes/:societeId/exercices')
export class ExercicesController {
  constructor(private readonly exercicesService: ExercicesService) {}

  @Post()
  create(@Param('societeId') societeId: string, @Body() dto: CreateExerciceDto) {
    return this.exercicesService.createExercice(societeId, dto);
  }

  @Get()
  list(@Param('societeId') societeId: string) {
    return this.exercicesService.listExercices(societeId);
  }

  @Get('courant')
  getCourant(@Param('societeId') societeId: string) {
    return this.exercicesService.getExerciceCourant(societeId);
  }

  @Get(':id')
  getById(
    @Param('societeId') societeId: string,
    @Param('id') exerciceId: string,
  ) {
    return this.exercicesService.getExerciceById(societeId, exerciceId);
  }

  @Patch(':id/fermer')
  fermer(
    @Param('societeId') societeId: string,
    @Param('id') exerciceId: string,
  ) {
    return this.exercicesService.fermerExercice(societeId, exerciceId);
  }

  @Patch(':id/rouvrir')
  rouvrir(
    @Param('societeId') societeId: string,
    @Param('id') exerciceId: string,
  ) {
    return this.exercicesService.rouvrirExercice(societeId, exerciceId);
  }

  @Delete(':id')
  delete(
    @Param('societeId') societeId: string,
    @Param('id') exerciceId: string,
  ) {
    return this.exercicesService.deleteExercice(societeId, exerciceId);
  }
}
