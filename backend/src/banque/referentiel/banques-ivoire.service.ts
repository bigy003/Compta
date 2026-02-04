import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface BanqueIvoireDto {
  id: string;
  code: string;
  nom: string;
  codeBIC?: string;
  codeGuichet?: string;
  actif: boolean;
}

@Injectable()
export class BanquesIvoireService {
  constructor(private prisma: PrismaService) {}

  /**
   * Initialise les banques ivoiriennes dans la base de données
   */
  async initialiserBanques(): Promise<void> {
    const banquesFilePath = path.join(
      __dirname,
      'banques-ivoire.json',
    );
    const banquesData = JSON.parse(
      fs.readFileSync(banquesFilePath, 'utf-8'),
    ) as Array<{
      code: string;
      nom: string;
      codeBIC?: string;
      codeGuichet?: string;
      actif: boolean;
    }>;

    for (const banque of banquesData) {
      await this.prisma.banqueIvoire.upsert({
        where: { code: banque.code },
        update: {
          nom: banque.nom,
          codeBIC: banque.codeBIC || null,
          codeGuichet: banque.codeGuichet || null,
          actif: banque.actif,
        },
        create: {
          id: `banq_${banque.code.toLowerCase()}`,
          code: banque.code,
          nom: banque.nom,
          codeBIC: banque.codeBIC || null,
          codeGuichet: banque.codeGuichet || null,
          actif: banque.actif,
        },
      });
    }
  }

  /**
   * Récupère toutes les banques ivoiriennes actives
   */
  async getAllBanques(): Promise<BanqueIvoireDto[]> {
    const banques = await this.prisma.banqueIvoire.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
    });
    return banques.map(this.mapToDto);
  }

  /**
   * Récupère une banque par son code
   */
  async getBanqueByCode(code: string): Promise<BanqueIvoireDto> {
    const banque = await this.prisma.banqueIvoire.findUnique({
      where: { code },
    });
    if (!banque) {
      throw new Error(`Banque ${code} introuvable`);
    }
    return this.mapToDto(banque);
  }

  private mapToDto(b: any): BanqueIvoireDto {
    return {
      id: b.id,
      code: b.code,
      nom: b.nom,
      codeBIC: b.codeBIC,
      codeGuichet: b.codeGuichet,
      actif: b.actif,
    };
  }
}
