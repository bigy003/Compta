import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateClientDto {
  nom: string;
  adresse?: string;
  email?: string;
  telephone?: string;
  numeroCc?: string;
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllBySociete(societeId: string) {
    return this.prisma.client.findMany({
      where: { societeId },
      orderBy: { nom: 'asc' },
    });
  }

  async createForSociete(societeId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        societeId,
        ...dto,
      },
    });
  }

  async updateForSociete(
    societeId: string,
    clientId: string,
    dto: Partial<CreateClientDto>,
  ) {
    const existing = await this.prisma.client.findFirst({
      where: { id: clientId, societeId },
    });
    if (!existing) {
      throw new NotFoundException('Client introuvable');
    }

    return this.prisma.client.update({
      where: { id: clientId },
      data: dto,
    });
  }

  async deleteForSociete(societeId: string, clientId: string) {
    const existing = await this.prisma.client.findFirst({
      where: { id: clientId, societeId },
    });
    if (!existing) {
      throw new NotFoundException('Client introuvable');
    }

    await this.prisma.client.delete({
      where: { id: clientId },
    });

    return { success: true };
  }
}

