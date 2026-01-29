import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocietesService {
  constructor(private readonly prisma: PrismaService) {}

  // Liste toutes les sociétés
  findAll() {
    return this.prisma.societe.findMany();
  }

  // Mise à jour simple (par ex. corriger le nom)
  update(id: string, data: { nom?: string }) {
    return this.prisma.societe.update({
      where: { id },
      data,
    });
  }
}

