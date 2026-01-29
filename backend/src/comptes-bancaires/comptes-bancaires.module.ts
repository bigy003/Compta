import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ComptesBancairesService } from './comptes-bancaires.service';
import { ComptesBancairesController } from './comptes-bancaires.controller';

@Module({
  imports: [PrismaModule],
  providers: [ComptesBancairesService],
  controllers: [ComptesBancairesController],
})
export class ComptesBancairesModule {}
