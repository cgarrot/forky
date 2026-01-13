import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { ProjectViewportDto } from './shared/project-viewport.dto'
import { QuickActionDto } from './shared/quick-action.dto'

export class CreateProjectDto {
  @ApiProperty({ example: 'Projet sans titre' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ example: 'Description du projet' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional({ example: 'Tu es un assistant utile.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  @ApiPropertyOptional({ type: ProjectViewportDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectViewportDto)
  viewport?: ProjectViewportDto

  @ApiPropertyOptional({ type: [QuickActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickActionDto)
  quickActions?: QuickActionDto[]
}
