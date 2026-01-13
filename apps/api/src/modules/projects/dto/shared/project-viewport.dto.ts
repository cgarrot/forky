import { ApiProperty } from '@nestjs/swagger'
import { IsNumber } from 'class-validator'

export class ProjectViewportDto {
  @ApiProperty({ example: 0 })
  @IsNumber()
  x!: number

  @ApiProperty({ example: 0 })
  @IsNumber()
  y!: number

  @ApiProperty({ example: 1 })
  @IsNumber()
  zoom!: number
}
