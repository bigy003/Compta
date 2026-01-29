import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  createUser(data: { email: string; password: string; name: string; phone?: string }) {
    return this.prisma.user.create({
      data,
    });
  }
}