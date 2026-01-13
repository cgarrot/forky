import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class JoinProjectDto {
  @ApiProperty({ example: 'project_123' })
  @IsString()
  @IsNotEmpty()
  projectId!: string
}

export class MoveCursorDto {
  @ApiProperty({ example: 'project_123' })
  @IsString()
  @IsNotEmpty()
  projectId!: string

  @ApiProperty({ example: 0 })
  @IsNumber()
  x!: number

  @ApiProperty({ example: 0 })
  @IsNumber()
  y!: number

  @ApiPropertyOptional({ example: 'node_123' })
  @IsOptional()
  @IsString()
  nodeId?: string
}

export class UpdateNodeDto {
  @ApiProperty({ example: 'project_123' })
  @IsString()
  @IsNotEmpty()
  projectId!: string

  @ApiProperty({ example: 'node_123' })
  @IsString()
  @IsNotEmpty()
  nodeId!: string

  @ApiProperty({ type: Object })
  @IsObject()
  data!: Record<string, unknown>
}

class PositionDto {
  @ApiProperty({ example: 0 })
  @IsNumber()
  x!: number

  @ApiProperty({ example: 0 })
  @IsNumber()
  y!: number
}

export class CreateNodeDto {
  @ApiProperty({ example: 'project_123' })
  @IsString()
  @IsNotEmpty()
  projectId!: string

  @ApiProperty({ example: 'Prompt' })
  @IsString()
  @IsNotEmpty()
  prompt!: string

  @ApiProperty({ type: PositionDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PositionDto)
  position!: PositionDto

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentIds?: string[]
}

export class DeleteNodeDto {
  @ApiProperty({ example: 'project_123' })
  @IsString()
  @IsNotEmpty()
  projectId!: string

  @ApiProperty({ example: 'node_123' })
  @IsString()
  @IsNotEmpty()
  nodeId!: string
}
