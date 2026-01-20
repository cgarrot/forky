import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  clearAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from '../../common/utils/auth-cookies';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(dto);
    setAccessTokenCookie(res, data.tokens.accessToken, 15 * 60);
    setRefreshTokenCookie(res, data.tokens.refreshToken, 7 * 24 * 60 * 60);

    return {
      success: true,
      data: {
        user: data.user,
        access_token: data.tokens.accessToken,
        refresh_token: data.tokens.refreshToken,
      },
      message: 'Account created successfully',
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(dto);
    setAccessTokenCookie(res, data.tokens.accessToken, 15 * 60);
    setRefreshTokenCookie(res, data.tokens.refreshToken, 7 * 24 * 60 * 60);

    return {
      success: true,
      data: {
        user: data.user,
        access_token: data.tokens.accessToken,
        refresh_token: data.tokens.refreshToken,
        expires_in: 15 * 60,
      },
      message: 'Login successful',
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.refresh(dto.refresh_token);
    setAccessTokenCookie(res, data.accessToken, 15 * 60);
    return {
      success: true,
      data: {
        access_token: data.accessToken,
        expires_in: 15 * 60,
      },
      message: 'Token refreshed',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logoutUser(user.sub);
    clearAuthCookies(res);
  }
}
