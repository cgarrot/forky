import { Body, Controller, Delete, Get, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AuthService } from '../auth/auth.service'
import { ChangePasswordDto } from './dto/change-password.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

type AuthenticatedUser = {
  sub: string
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.usersService.getById(user.sub)
    return { success: true, data }
  }

  @Put('me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    const data = await this.usersService.update(user.sub, dto)
    return { success: true, data }
  }

  @Patch('me/password')
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword)
    return { success: true, message: 'Password updated' }
  }

  @Post('change-password')
  async changePasswordLegacy(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.changePassword(user, dto)
  }

  @Patch('me')
  async updateMeLegacy(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.updateMe(user, dto)
  }

  @Delete('me')
  async deleteMe(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.softDelete(user.sub)
    return { success: true, message: 'Account deleted' }
  }
}
