import { Module } from '@nestjs/common';
import { RapprochementAvanceController } from './rapprochement-avance.controller';
import { RapprochementAvanceService } from './rapprochement-avance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RapprochementAvanceController],
  providers: [RapprochementAvanceService],
  exports: [RapprochementAvanceService],
})
export class RapprochementAvanceModule {}
