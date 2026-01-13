import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsObject, IsOptional, IsString } from 'class-validator'

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user123' })
  @IsOptional()
  @IsString()
  username?: string

  @ApiPropertyOptional({ example: 'Ada' })
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional({ example: 'Lovelace' })
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatar?: string

  @ApiPropertyOptional({ example: { lastProjectId: 'project_123' } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>
}
