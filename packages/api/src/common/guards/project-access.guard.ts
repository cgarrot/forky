import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service';

type AuthTokenPayload = {
  sub: string;
};

type RequestWithUser = Request & { user?: AuthTokenPayload };

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const userId = request.user?.sub;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const projectId =
      (request.params.projectId as string | undefined) ??
      (request.params.id as string | undefined);

    if (!projectId) {
      return true;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId === userId) {
      return true;
    }

    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
