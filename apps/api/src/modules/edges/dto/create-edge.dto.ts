import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEdgeDto {
  @ApiPropertyOptional({ example: 'edge_123' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  id?: string;

  @ApiProperty({ example: 'node_1' })
  @IsString()
  @MinLength(1)
  sourceId!: string;

  @ApiProperty({ example: 'node_2' })
  @IsString()
  @MinLength(1)
  targetId!: string;
}
