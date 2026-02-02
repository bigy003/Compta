import { Module } from '@nestjs/common';
import { ImmobilisationsController } from './immobilisations.controller';
import { ImmobilisationsService } from './immobilisations.service';

@Module({
  controllers: [ImmobilisationsController],
  providers: [ImmobilisationsService],
  exports: [ImmobilisationsService],
})
export class ImmobilisationsModule {}
