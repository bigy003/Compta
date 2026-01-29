import { Module } from '@nestjs/common';
import { ExercicesService } from './exercices.service';
import { ExercicesController } from './exercices.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExercicesController],
  providers: [ExercicesService],
  exports: [ExercicesService],
})
export class ExercicesModule {}
