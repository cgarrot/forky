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
export class EdgeAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()

    const userId = request.user?.sub
    if (!userId) {
      throw new ForbiddenException('User not authenticated')
    }

    const edgeId = request.params.id as string | undefined
    if (!edgeId) {
      return true
    }

    const edge = await this.prisma.edge.findUnique({
      where: { id: edgeId },
      select: { projectId: true },
    })

    if (!edge) {
      throw new NotFoundException('Edge not found')
    }

    const project = await this.prisma.project.findFirst({
      where: { id: edge.projectId, deletedAt: null },
      select: { ownerId: true },
    })

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    if (project.ownerId === userId) {
      return true
    }

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: edge.projectId, userId } },
      select: { id: true },
    })

    if (!member) {
      throw new ForbiddenException('Access denied')
    }

    return true
  }
}
