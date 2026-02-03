import { Module } from '@nestjs/common';
import { EcheancesFiscalesController } from './echeances-fiscales.controller';
import { EcheancesFiscalesService } from './echeances-fiscales.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EcheancesFiscalesController],
  providers: [EcheancesFiscalesService],
  exports: [EcheancesFiscalesService],
})
export class EcheancesFiscalesModule {}
