import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PositionDto } from './position.dto';

export class UpdateNodeDto {
  @ApiPropertyOptional({ example: 'Nouveau prompt' })
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(2000)
  prompt?: string;

  @ApiPropertyOptional({ example: 'Réponse...' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  response?: string;

  @ApiPropertyOptional({ example: 'Résumé...' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  summary?: string;

  @ApiPropertyOptional({
    example: 'IDLE',
    enum: ['IDLE', 'GENERATING', 'COMPLETED', 'ERROR', 'STALE'],
  })
  @IsOptional()
  @IsIn(['IDLE', 'GENERATING', 'COMPLETED', 'ERROR', 'STALE'])
  status?: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'ERROR' | 'STALE';

  @ApiPropertyOptional({ type: PositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentIds?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'glm-4.7' })
  @IsOptional()
  @IsString()
  llmModel?: string;

  @ApiPropertyOptional({ example: 1234 })
  @IsOptional()
  @IsNumber()
  llmTokens?: number;
}
