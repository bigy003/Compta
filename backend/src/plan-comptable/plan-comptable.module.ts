import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanComptableService } from './plan-comptable.service';
import { PlanComptableController } from './plan-comptable.controller';

@Module({
  imports: [PrismaModule],
  providers: [PlanComptableService],
  controllers: [PlanComptableController],
  exports: [PlanComptableService],
})
export class PlanComptableModule {}
