import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FacturesModule } from '../factures/factures.module';
import { DevisService } from './devis.service';
import { DevisController } from './devis.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => FacturesModule)],
  controllers: [DevisController],
  providers: [DevisService],
  exports: [DevisService],
})
export class DevisModule {}
