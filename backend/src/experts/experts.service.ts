import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpertsService {
  constructor(private readonly prisma: PrismaService) {}

  // Pour le MVP, un expert voit toutes les sociétés
  findAllSocietes() {
    return this.prisma.societe.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

