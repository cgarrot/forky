import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsNotEmpty } from 'class-validator'
import type { ProjectRole } from '@prisma/client'

const ALLOWED_MEMBER_ROLES: ProjectRole[] = ['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER']

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'MEMBER', enum: ALLOWED_MEMBER_ROLES })
  @IsIn(ALLOWED_MEMBER_ROLES)
  @IsNotEmpty()
  role!: ProjectRole
}
