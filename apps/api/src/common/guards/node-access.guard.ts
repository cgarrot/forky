import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '../database/prisma.service'

type AuthTokenPayload = {
  sub: string
}

type RequestWithUser = Request & { user?: AuthTokenPayload }

@Injectable()
export class NodeAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()

    const userId = request.user?.sub
    if (!userId) {
      throw new ForbiddenException('User not authenticated')
    }

    const nodeId = request.params.id as string | undefined
    if (!nodeId) {
      return true
    }

    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null },
      select: { projectId: true },
    })

    if (!node) {
      throw new NotFoundException('Node not found')
    }

    const project = await this.prisma.project.findFirst({
      where: { id: node.projectId, deletedAt: null },
      select: { ownerId: true },
    })

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    if (project.ownerId === userId) {
      return true
    }

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: node.projectId, userId } },
      select: { id: true },
    })

    if (!member) {
      throw new ForbiddenException('Access denied')
    }

    return true
  }
}
