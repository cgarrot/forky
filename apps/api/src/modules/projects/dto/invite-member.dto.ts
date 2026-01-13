import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import type { ProjectRole } from '@prisma/client';

const ALLOWED_MEMBER_ROLES: ProjectRole[] = [
  'ADMIN',
  'EDITOR',
  'MEMBER',
  'VIEWER',
];

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: 'MEMBER', enum: ALLOWED_MEMBER_ROLES })
  @IsOptional()
  @IsIn(ALLOWED_MEMBER_ROLES)
  role?: ProjectRole;
}
