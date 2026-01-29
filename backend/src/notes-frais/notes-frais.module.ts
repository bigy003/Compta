import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesFraisService } from './notes-frais.service';
import { NotesFraisController } from './notes-frais.controller';

@Module({
  imports: [PrismaModule],
  providers: [NotesFraisService],
  controllers: [NotesFraisController],
})
export class NotesFraisModule {}
