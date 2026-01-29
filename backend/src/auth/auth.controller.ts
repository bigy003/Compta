import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class RegisterPmeDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  societeNom: string;
}

class RegisterExpertDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registerPme(@Body() dto: RegisterPmeDto) {
    return this.authService.registerPme(dto);
  }

  @Post('register-expert')
  registerExpert(@Body() dto: RegisterExpertDto) {
    return this.authService.registerExpert(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

