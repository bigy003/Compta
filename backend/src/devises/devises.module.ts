import { Module } from '@nestjs/common';
import { DevisesController } from './devises.controller';
import { DevisesService } from './devises.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DevisesController],
  providers: [DevisesService],
  exports: [DevisesService],
})
export class DevisesModule {}
