import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class RefreshDto {
  @ApiProperty({ example: 'refresh_token' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string
}
