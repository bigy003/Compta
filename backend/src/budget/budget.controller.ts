import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { BudgetService } from './budget.service';

@Controller('societes/:societeId/budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  createOrUpdate(
    @Param('societeId') societeId: string,
    @Body() body: { annee: number; budgetRecettes: number; budgetDepenses: number },
  ) {
    return this.budgetService.createOrUpdate(societeId, body);
  }

  @Get('comparaison')
  listAvecComparaison(@Param('societeId') societeId: string) {
    return this.budgetService.listAvecComparaison(societeId);
  }

  @Get()
  findAll(@Param('societeId') societeId: string) {
    return this.budgetService.findAll(societeId);
  }

  @Get(':annee/comparaison')
  getAvecComparaison(
    @Param('societeId') societeId: string,
    @Param('annee', ParseIntPipe) annee: number,
  ) {
    return this.budgetService.getAvecComparaison(societeId, annee);
  }

  @Get(':annee')
  findOne(
    @Param('societeId') societeId: string,
    @Param('annee', ParseIntPipe) annee: number,
  ) {
    return this.budgetService.findOne(societeId, annee);
  }

  @Delete(':annee')
  delete(
    @Param('societeId') societeId: string,
    @Param('annee', ParseIntPipe) annee: number,
  ) {
    return this.budgetService.delete(societeId, annee);
  }
}
