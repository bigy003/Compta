import { Module } from '@nestjs/common';
import { BanqueController } from './banque.controller';
import { BanqueService } from './banque.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EcartsService } from './rapprochement/ecarts.service';
import { RapprochementComptableService } from './rapprochement/rapprochement-comptable.service';
import { LettrageAutomatiqueService } from './rapprochement/lettrage-automatique.service';
import { ImportMultiFormatsService } from './import/import-multi-formats.service';
import { BanquesIvoireService } from './referentiel/banques-ivoire.service';

@Module({
  imports: [PrismaModule],
  controllers: [BanqueController],
  providers: [
    BanqueService,
    EcartsService,
    RapprochementComptableService,
    LettrageAutomatiqueService,
    ImportMultiFormatsService,
    BanquesIvoireService,
  ],
  exports: [
    BanqueService,
    EcartsService,
    RapprochementComptableService,
    LettrageAutomatiqueService,
    ImportMultiFormatsService,
    BanquesIvoireService,
  ],
})
export class BanqueModule {}
