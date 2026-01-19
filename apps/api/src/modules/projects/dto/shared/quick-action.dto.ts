import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class QuickActionDto {
  @ApiProperty({ example: 'qa-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  id!: string;

  @ApiProperty({ example: 'Concis' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  label!: string;

  @ApiProperty({ example: 'Rephrase more concisely.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  instruction!: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  order!: number;
}
