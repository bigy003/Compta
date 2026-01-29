import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DeclarationsTvaService } from './declarations-tva.service';
import { DeclarationsTvaController } from './declarations-tva.controller';

@Module({
  imports: [PrismaModule],
  providers: [DeclarationsTvaService],
  controllers: [DeclarationsTvaController],
})
export class DeclarationsTvaModule {}
