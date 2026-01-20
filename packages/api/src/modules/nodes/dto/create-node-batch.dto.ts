import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { CreateNodeDto } from './create-node.dto';

export class CreateNodeBatchDto {
  @ApiProperty({ type: [CreateNodeDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateNodeDto)
  nodes!: CreateNodeDto[];
}
