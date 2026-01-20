import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateTitleDto {
  @ApiProperty({ example: 'Prompt text' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiProperty({ example: 'Response text' })
  @IsString()
  @IsNotEmpty()
  response!: string;

  @ApiProperty({ example: 'glm-4.7', required: false })
  @IsOptional()
  @IsString()
  model?: string;
}
