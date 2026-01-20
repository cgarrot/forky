import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

const ALLOWED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3.5-sonnet',
  'glm-4',
  'glm-4.7',
  'glm-4-32B-0414-128K',
];

export class GenerateNodeDto {
  @ApiProperty({ example: 'glm-4.7', enum: ALLOWED_MODELS })
  @IsIn(ALLOWED_MODELS)
  model!: string;

  @ApiPropertyOptional({ example: 0.7, minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ example: 2000, minimum: 1, maximum: 128000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number;
}
