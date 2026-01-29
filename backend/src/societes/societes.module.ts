import { Module } from '@nestjs/common';
import { SocietesService } from './societes.service';
import { SocietesController } from './societes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SocietesController],
  providers: [SocietesService],
})
export class SocietesModule {}

