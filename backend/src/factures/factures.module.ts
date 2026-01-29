import { Module, forwardRef } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { FacturesController } from './factures.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanComptableModule } from '../plan-comptable/plan-comptable.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PlanComptableModule), EmailModule],
  controllers: [FacturesController],
  providers: [FacturesService],
  exports: [FacturesService],
})
export class FacturesModule {}

