import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { PositionDto } from './position.dto'

export class CreateNodeDto {
  @ApiPropertyOptional({ example: 'node_123' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  id?: string

  @ApiProperty({ example: 'Que devrais-je explorer ?' })
  @IsString()
  @MinLength(0)
  @MaxLength(2000)
  prompt!: string

  @ApiProperty({ type: PositionDto })
  @ValidateNested()
  @Type(() => PositionDto)
  position!: PositionDto

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentIds?: string[]
}
