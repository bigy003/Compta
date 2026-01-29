import { Controller, Get } from '@nestjs/common';
import { ExpertsService } from './experts.service';

@Controller('experts')
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get('societes')
  listSocietes() {
    return this.expertsService.findAllSocietes();
  }
}

