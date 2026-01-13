import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);

    return {
      success: true,
      data: {
        user: data.user,
        access_token: data.tokens.accessToken,
        refresh_token: data.tokens.refreshToken,
      },
      message: 'Compte créé avec succès',
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);

    return {
      success: true,
      data: {
        user: data.user,
        access_token: data.tokens.accessToken,
        refresh_token: data.tokens.refreshToken,
        expires_in: 15 * 60,
      },
      message: 'Connexion réussie',
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto) {
    const data = await this.authService.refresh(dto.refresh_token);
    return {
      success: true,
      data: {
        access_token: data.accessToken,
        expires_in: 15 * 60,
      },
      message: 'Token rafraîchi',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(@CurrentUser() user: { sub: string }): Promise<void> {
    await this.authService.logoutUser(user.sub);
  }
}
