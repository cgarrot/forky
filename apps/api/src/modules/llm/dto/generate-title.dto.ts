import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateTitleDto {
  @ApiProperty({ example: 'Prompt' })
  @IsString()
  @MinLength(1)
  prompt!: string;

  @ApiProperty({ example: 'Response' })
  @IsString()
  @MinLength(1)
  response!: string;

  @ApiPropertyOptional({ example: 'glm-4.7' })
  @IsOptional()
  @IsString()
  model?: string;
}
