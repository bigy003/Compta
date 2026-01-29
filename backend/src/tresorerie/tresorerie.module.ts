import { Module, forwardRef } from '@nestjs/common';
import { TresorerieService } from './tresorerie.service';
import { TresorerieController } from './tresorerie.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanComptableModule } from '../plan-comptable/plan-comptable.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PlanComptableModule)],
  controllers: [TresorerieController],
  providers: [TresorerieService],
})
export class TresorerieModule {}

