import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ClientsService } from './clients.service';

class CreateClientDto {
  nom: string;
  adresse?: string;
  email?: string;
  telephone?: string;
  numeroCc?: string;
}

@Controller('societes/:societeId/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  list(@Param('societeId') societeId: string) {
    return this.clientsService.findAllBySociete(societeId);
  }

  @Post()
  create(
    @Param('societeId') societeId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.createForSociete(societeId, dto);
  }

  @Patch(':id')
  update(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateClientDto>,
  ) {
    return this.clientsService.updateForSociete(societeId, id, dto);
  }

  @Delete(':id')
  remove(@Param('societeId') societeId: string, @Param('id') id: string) {
    return this.clientsService.deleteForSociete(societeId, id);
  }
}

