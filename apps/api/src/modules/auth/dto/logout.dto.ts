import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class LogoutDto {
  @ApiProperty({ example: 'refresh_token' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string
}
