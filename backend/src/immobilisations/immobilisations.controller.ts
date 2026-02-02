import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ImmobilisationsService } from './immobilisations.service';
import { CreateImmobilisationDto } from './dto/create-immobilisation.dto';
import { UpdateImmobilisationDto } from './dto/update-immobilisation.dto';

@Controller('societes/:societeId/immobilisations')
export class ImmobilisationsController {
  constructor(private readonly immobilisationsService: ImmobilisationsService) {}

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Body() body: CreateImmobilisationDto,
  ) {
    return this.immobilisationsService.create(societeId, body);
  }

  @Get()
  findAll(@Param('societeId') societeId: string) {
    return this.immobilisationsService.findAll(societeId);
  }

  @Get(':id/plan-amortissement')
  getPlanAmortissement(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.immobilisationsService.getPlanAmortissement(societeId, id);
  }

  @Get(':id')
  findOne(@Param('societeId') societeId: string, @Param('id') id: string) {
    return this.immobilisationsService.getOneAvecPlan(societeId, id);
  }

  @Patch(':id')
  update(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() body: UpdateImmobilisationDto,
  ) {
    return this.immobilisationsService.update(societeId, id, body);
  }

  @Delete(':id')
  delete(@Param('societeId') societeId: string, @Param('id') id: string) {
    return this.immobilisationsService.delete(societeId, id);
  }
}
