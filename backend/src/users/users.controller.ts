import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';

class CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }
}

