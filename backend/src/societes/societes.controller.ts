import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { SocietesService } from './societes.service';

class UpdateSocieteDto {
  nom?: string;
}

@Controller('societes')
export class SocietesController {
  constructor(private readonly societesService: SocietesService) {}

  @Get()
  list() {
    return this.societesService.findAll();
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSocieteDto,
  ) {
    return this.societesService.update(id, dto);
  }
}

