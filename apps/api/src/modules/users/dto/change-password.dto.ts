import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ssw0rd1' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string

  @ApiProperty({ example: 'NewP@ssw0rd1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  newPassword!: string
}
