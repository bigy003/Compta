import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

interface RegisterPmeDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  societeNom: string;
}

interface RegisterExpertDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerPme(dto: RegisterPmeDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hash,
          name: dto.name,
          phone: dto.phone,
          role: Role.PME,
        },
      });

      await tx.societe.create({
        data: {
          nom: dto.societeNom,
          ownerId: createdUser.id,
        },
      });

      return createdUser;
    });

    const token = await this.signToken(user.id, user.email, user.role);
    const { password, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async registerExpert(dto: RegisterExpertDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        name: dto.name,
        phone: dto.phone,
        role: Role.EXPERT,
      },
    });

    const token = await this.signToken(user.id, user.email, user.role);
    const { password, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const token = await this.signToken(user.id, user.email, user.role);
    const { password, ...safeUser } = user;
    return { user: safeUser, token };
  }

  private signToken(userId: string, email: string, role: Role) {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      role,
    });
  }
}

