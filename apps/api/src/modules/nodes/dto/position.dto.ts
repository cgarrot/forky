import { ApiProperty } from '@nestjs/swagger'
import { IsNumber } from 'class-validator'

export class PositionDto {
  @ApiProperty({ example: 0 })
  @IsNumber()
  x!: number

  @ApiProperty({ example: 0 })
  @IsNumber()
  y!: number
}
