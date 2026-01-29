import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { SocietesModule } from './societes/societes.module';
import { FacturesModule } from './factures/factures.module';
import { TresorerieModule } from './tresorerie/tresorerie.module';
import { ExpertsModule } from './experts/experts.module';
import { NotesFraisModule } from './notes-frais/notes-frais.module';
import { ComptesBancairesModule } from './comptes-bancaires/comptes-bancaires.module';
import { PlanComptableModule } from './plan-comptable/plan-comptable.module';
import { DeclarationsTvaModule } from './declarations-tva/declarations-tva.module';
import { DevisModule } from './devis/devis.module';
import { PaiementsModule } from './paiements/paiements.module';
import { ExercicesModule } from './exercices/exercices.module';
import { DocumentsModule } from './documents/documents.module';
import { RapprochementAvanceModule } from './rapprochement-avance/rapprochement-avance.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    SocietesModule,
    FacturesModule,
    TresorerieModule,
    ExpertsModule,
    NotesFraisModule,
    ComptesBancairesModule,
    PlanComptableModule,
    DeclarationsTvaModule,
    DevisModule,
    PaiementsModule,
    ExercicesModule,
    DocumentsModule,
    RapprochementAvanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
