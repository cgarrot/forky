import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/database/prisma.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import type { Project, ProjectViewport } from './types/project.type';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    userId: string;
    page: number;
    limit: number;
    search?: string;
    sort?: keyof Pick<Project, 'createdAt' | 'updatedAt' | 'name'>;
    order?: 'asc' | 'desc';
  }) {
    const {
      userId,
      page,
      limit,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
        include: {
          owner: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      success: true,
      data: items.map((item) => this.mapToEntity(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private toQuickActionsJson(value: CreateProjectDto['quickActions']) {
    if (!value) return Prisma.JsonNull;

    return value.map((item) => ({
      id: item.id,
      label: item.label,
      instruction: item.instruction,
      order: item.order,
    })) as unknown as Prisma.InputJsonValue;
  }

  async create(ownerId: string, input: CreateProjectDto) {
    const defaultViewport: ProjectViewport = { x: 0, y: 0, zoom: 1 };

    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, deletedAt: null },
      select: { id: true, isGuest: true },
    });

    if (!owner) {
      throw new NotFoundException('User not found');
    }

    if (owner.isGuest) {
      const existing = await this.prisma.project.count({
        where: { ownerId, deletedAt: null },
      });
      if (existing >= 1) {
        throw new ConflictException({
          code: 'GUEST_PROJECT_LIMIT',
          message: 'A guest can only create one project',
        });
      }
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const shareToken = this.generateShareToken();

      try {
        const project = await this.prisma.project.create({
          data: {
            name: input.name,
            description: input.description,
            systemPrompt: input.systemPrompt ?? 'You are a helpful assistant.',
            isPublic: input.isPublic ?? false,
            shareToken,
            viewport: input.viewport
              ? {
                  x: input.viewport.x,
                  y: input.viewport.y,
                  zoom: input.viewport.zoom,
                }
              : defaultViewport,
            quickActions: this.toQuickActionsJson(input.quickActions),
            owner: {
              connect: { id: ownerId },
            },
            members: {
              create: {
                userId: ownerId,
                role: 'OWNER',
              },
            },
            memberCount: 1,
            deletedAt: null,
          },
          include: {
            owner: true,
          },
        });

        return {
          success: true,
          data: this.mapToEntity(project),
          message: 'Project created successfully',
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to generate share token');
  }

  async getById(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const shareToken = await this.ensureShareToken(
      project.id,
      project.shareToken,
    );

    return {
      success: true,
      data: this.mapToDetailEntity({ ...project, shareToken }),
    };
  }

  async update(id: string, input: UpdateProjectDto) {
    try {
      const updated = await this.prisma.project.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.systemPrompt !== undefined
            ? { systemPrompt: input.systemPrompt }
            : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
          ...(input.viewport !== undefined
            ? {
                viewport: input.viewport
                  ? {
                      x: input.viewport.x,
                      y: input.viewport.y,
                      zoom: input.viewport.zoom,
                    }
                  : Prisma.JsonNull,
              }
            : {}),
          ...(input.quickActions !== undefined
            ? { quickActions: this.toQuickActionsJson(input.quickActions) }
            : {}),
        },
        include: {
          owner: true,
        },
      });

      return {
        success: true,
        data: this.mapToEntity(updated),
        message: 'Project updated',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Project not found');
      }
      throw error;
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.project.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { success: true, message: 'Project deleted' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Project not found');
      }
      throw error;
    }
  }

  async assertUserHasAccess(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { ownerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId === userId) {
      return;
    }

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });

    if (!member) {
      throw new ForbiddenException('Access denied');
    }
  }

  async listMembers(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      success: true,
      data: members.map((member) => this.mapToMemberEntity(member)),
    };
  }

  async inviteMember(params: {
    projectId: string;
    actorId: string;
    email: string;
    role?: ProjectRole;
  }) {
    const { canManage } = await this.getProjectAccess(
      params.projectId,
      params.actorId,
    );
    if (!canManage) {
      throw new ForbiddenException('Access denied');
    }

    const role: ProjectRole = params.role ?? 'MEMBER';
    if (role === 'OWNER') {
      throw new ConflictException('Invalid role');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: params.email, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const member = await tx.projectMember.create({
          data: {
            projectId: params.projectId,
            userId: user.id,
            role,
          },
          include: { user: true },
        });

        await tx.project.update({
          where: { id: params.projectId },
          data: { memberCount: { increment: 1 } },
        });

        return member;
      });

      return {
        success: true,
        data: this.mapToMemberEntity(created),
        message: 'User invited successfully',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User already member');
      }
      throw error;
    }
  }

  async removeMember(params: {
    projectId: string;
    actorId: string;
    memberId: string;
  }) {
    const { project, canManage } = await this.getProjectAccess(
      params.projectId,
      params.actorId,
    );
    if (!canManage) {
      throw new ForbiddenException('Access denied');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: { id: params.memberId, projectId: params.projectId },
      select: { id: true, userId: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.userId === project.ownerId) {
      throw new ForbiddenException('Cannot remove project owner');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({ where: { id: member.id } });
      await tx.project.update({
        where: { id: params.projectId },
        data: { memberCount: { decrement: 1 } },
      });
    });

    return { success: true };
  }

  async updateMemberRole(params: {
    projectId: string;
    actorId: string;
    memberId: string;
    role: ProjectRole;
  }) {
    const { project, canManage } = await this.getProjectAccess(
      params.projectId,
      params.actorId,
    );
    if (!canManage) {
      throw new ForbiddenException('Access denied');
    }

    if (params.role === 'OWNER') {
      throw new ConflictException('Invalid role');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: { id: params.memberId, projectId: params.projectId },
      select: { id: true, userId: true, joinedAt: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.userId === project.ownerId) {
      throw new ForbiddenException('Cannot change owner role');
    }

    const updated = await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role: params.role },
      select: { id: true, userId: true, role: true, joinedAt: true },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
        joinedAt: updated.joinedAt.toISOString(),
      },
      message: 'Role updated',
    };
  }

  private async getProjectAccess(
    projectId: string,
    actorId: string,
  ): Promise<{ project: { id: string; ownerId: string }; canManage: boolean }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId === actorId) {
      return { project, canManage: true };
    }

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
      select: { role: true },
    });

    if (!member) {
      return { project, canManage: false };
    }

    return { project, canManage: member.role === 'ADMIN' };
  }

  private mapToOwner(raw: {
    id: string;
    email: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  }) {
    return {
      id: raw.id,
      email: raw.email,
      username: raw.username ?? '',
      firstName: raw.firstName ?? null,
      lastName: raw.lastName ?? null,
      avatar: raw.avatar,
    };
  }

  private mapToEntity(
    raw: Prisma.ProjectGetPayload<{ include: { owner: true } }>,
  ): Project {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description ?? null,
      systemPrompt: raw.systemPrompt,
      ownerId: raw.ownerId,
      owner: {
        id: raw.owner.id,
        email: raw.owner.email,
        username: raw.owner.username ?? '',
        avatar: raw.owner.avatar,
      },
      isPublic: raw.isPublic,
      shareToken: raw.shareToken ?? null,
      nodeCount: raw.nodeCount,
      memberCount: raw.memberCount,
      viewport: (raw.viewport as unknown as ProjectViewport) ?? {
        x: 0,
        y: 0,
        zoom: 1,
      },
      quickActions:
        (raw.quickActions as unknown as Project['quickActions']) ?? null,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }

  private mapToDetailEntity(
    raw: Prisma.ProjectGetPayload<{
      include: { owner: true; members: { include: { user: true } } };
    }>,
  ) {
    return {
      ...this.mapToEntity(raw),
      owner: this.mapToOwner(raw.owner),
      members: raw.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        user: {
          id: member.user.id,
          email: member.user.email,
          username: member.user.username ?? '',
          avatar: member.user.avatar,
        },
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
      })),
    };
  }

  private mapToMemberEntity(
    raw: Prisma.ProjectMemberGetPayload<{ include: { user: true } }>,
  ) {
    return {
      id: raw.id,
      userId: raw.userId,
      user: {
        id: raw.user.id,
        email: raw.user.email,
        username: raw.user.username ?? '',
        avatar: raw.user.avatar,
      },
      role: raw.role,
      joinedAt: raw.joinedAt.toISOString(),
    };
  }

  async getByShareToken(
    shareToken: string,
  ): Promise<{ id: string; shareToken: string }> {
    const project = await this.prisma.project.findFirst({
      where: { shareToken, deletedAt: null },
      select: { id: true, shareToken: true },
    });

    if (!project || !project.shareToken) {
      throw new NotFoundException('Invalid share token');
    }

    return { id: project.id, shareToken: project.shareToken };
  }

  async addMemberIfMissing(projectId: string, userId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.projectMember.create({
          data: { projectId, userId, role: 'MEMBER' },
        });

        await tx.project.update({
          where: { id: projectId },
          data: { memberCount: { increment: 1 } },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private async ensureShareToken(
    projectId: string,
    current: string | null,
  ): Promise<string | null> {
    if (current) return current;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const shareToken = this.generateShareToken();

      try {
        const updated = await this.prisma.project.update({
          where: { id: projectId },
          data: { shareToken },
          select: { shareToken: true },
        });

        return updated.shareToken ?? null;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    return null;
  }

  private generateShareToken(): string {
    return randomBytes(24).toString('hex');
  }
}
