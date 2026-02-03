import { Module } from '@nestjs/common';
import { DeclarationsFiscalesController } from './declarations-fiscales.controller';
import { DeclarationsFiscalesService } from './declarations-fiscales.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeclarationsFiscalesController],
  providers: [DeclarationsFiscalesService],
  exports: [DeclarationsFiscalesService],
})
export class DeclarationsFiscalesModule {}
