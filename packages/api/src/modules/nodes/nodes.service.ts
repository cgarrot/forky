import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type NodeStatus } from '@prisma/client';
import type { CreateNodeDto } from './dto/create-node.dto';
import type { UpdateNodeDto } from './dto/update-node.dto';
import type { ProjectNode } from './types/node.type';
import { PrismaService } from '../../common/database/prisma.service';

function toNodeStatus(status: string | undefined): NodeStatus | undefined {
  if (!status) return undefined;
  if (
    status === 'IDLE' ||
    status === 'GENERATING' ||
    status === 'COMPLETED' ||
    status === 'ERROR' ||
    status === 'STALE'
  ) {
    return status;
  }
  return undefined;
}

function toPosition(position: unknown): { x: number; y: number } {
  if (
    typeof position === 'object' &&
    position !== null &&
    'x' in position &&
    'y' in position &&
    typeof (position as { x: unknown }).x === 'number' &&
    typeof (position as { y: unknown }).y === 'number'
  ) {
    return {
      x: (position as { x: number }).x,
      y: (position as { y: number }).y,
    };
  }

  return { x: 0, y: 0 };
}

function toProjectNode(params: {
  node: {
    id: string;
    projectId: string;
    prompt: string;
    response: string | null;
    summary: string | null;
    status: NodeStatus;
    position: unknown;
    llmModel: string | null;
    llmTokens: number | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
  parentIds: string[];
}): ProjectNode {
  const { node, parentIds } = params;

  return {
    id: node.id,
    projectId: node.projectId,
    prompt: node.prompt,
    response: node.response,
    summary: node.summary,
    status: node.status,
    position: toPosition(node.position),
    llmModel: node.llmModel,
    llmTokens: node.llmTokens,
    parentIds,
    metadata: (node.metadata as Record<string, unknown>) ?? {},
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}

@Injectable()
export class NodesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    projectId: string;
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { projectId, page, limit, status, search } = params;

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const statusFilter = toNodeStatus(status);

    const where: Prisma.NodeWhereInput = {
      projectId,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search
        ? {
            OR: [
              { prompt: { contains: search, mode: 'insensitive' } },
              { response: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, nodes] = await Promise.all([
      this.prisma.node.count({ where }),
      this.prisma.node.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const ids = nodes.map((n) => n.id);

    const parentEdges = ids.length
      ? await this.prisma.edge.findMany({
          where: { projectId, targetId: { in: ids } },
          select: { targetId: true, sourceId: true },
        })
      : [];

    const parentByTargetId = new Map<string, string[]>();

    for (const edge of parentEdges) {
      const list = parentByTargetId.get(edge.targetId) ?? [];
      list.push(edge.sourceId);
      parentByTargetId.set(edge.targetId, list);
    }

    const data = nodes.map((node) =>
      toProjectNode({
        node,
        parentIds: parentByTargetId.get(node.id) ?? [],
      }),
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async create(projectId: string, input: CreateNodeDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const parentIds = input.parentIds ?? [];

    if (parentIds.length) {
      const parents = await this.prisma.node.findMany({
        where: { id: { in: parentIds }, projectId, deletedAt: null },
        select: { id: true },
      });

      if (parents.length !== parentIds.length) {
        throw new BadRequestException('Invalid parentIds');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const node = await tx.node.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          projectId,
          prompt: input.prompt,
          response: null,
          summary: null,
          status: 'IDLE',
          position: { x: input.position.x, y: input.position.y },
          metadata: {},
          llmModel: null,
          llmTokens: null,
          llmCost: null,
        },
      });

      if (parentIds.length) {
        await tx.edge.createMany({
          data: parentIds.map((sourceId) => ({
            projectId,
            sourceId,
            targetId: node.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.project.update({
        where: { id: projectId },
        data: { nodeCount: { increment: 1 } },
      });

      return node;
    });

    return {
      success: true,
      data: toProjectNode({ node: created, parentIds }),
      message: 'Node created successfully',
    };
  }

  async createBatch(projectId: string, inputs: CreateNodeDto[]) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (inputs.length > 100) {
      throw new BadRequestException('Batch limit exceeded');
    }

    const createdNodes = await this.prisma.$transaction(async (tx) => {
      const created: ProjectNode[] = [];

      for (const input of inputs) {
        const parentIds = input.parentIds ?? [];

        if (parentIds.length) {
          const parents = await tx.node.findMany({
            where: { id: { in: parentIds }, projectId, deletedAt: null },
            select: { id: true },
          });

          if (parents.length !== parentIds.length) {
            throw new BadRequestException('Invalid parentIds');
          }
        }

        const node = await tx.node.create({
          data: {
            projectId,
            prompt: input.prompt,
            response: null,
            summary: null,
            status: 'IDLE',
            position: { x: input.position.x, y: input.position.y },
            metadata: {},
            llmModel: null,
            llmTokens: null,
            llmCost: null,
          },
        });

        if (parentIds.length) {
          await tx.edge.createMany({
            data: parentIds.map((sourceId) => ({
              projectId,
              sourceId,
              targetId: node.id,
            })),
            skipDuplicates: true,
          });
        }

        created.push(toProjectNode({ node, parentIds }));
      }

      await tx.project.update({
        where: { id: projectId },
        data: { nodeCount: { increment: created.length } },
      });

      return created;
    });

    return {
      success: true,
      data: createdNodes,
      message: `${createdNodes.length} nodes created successfully`,
    };
  }

  async getById(id: string) {
    const node = await this.prisma.node.findFirst({
      where: { id, deletedAt: null },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    const [incoming, outgoing] = await Promise.all([
      this.prisma.edge.findMany({
        where: { projectId: node.projectId, targetId: node.id },
        select: { id: true, sourceId: true },
      }),
      this.prisma.edge.findMany({
        where: { projectId: node.projectId, sourceId: node.id },
        select: { id: true, targetId: true },
      }),
    ]);

    const parentIds = incoming.map((e) => e.sourceId);

    return {
      success: true,
      data: {
        ...toProjectNode({ node, parentIds }),
        edges: {
          incoming: incoming.map((e) => e.id),
          outgoing: outgoing.map((e) => e.id),
        },
      },
    };
  }

  async update(id: string, input: UpdateNodeDto) {
    const existing = await this.prisma.node.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Node not found');
    }

    const parentIds = input.parentIds;

    if (parentIds && parentIds.length) {
      const parents = await this.prisma.node.findMany({
        where: {
          id: { in: parentIds },
          projectId: existing.projectId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (parents.length !== parentIds.length) {
        throw new BadRequestException('Invalid parentIds');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const node = await tx.node.update({
        where: { id },
        data: {
          ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
          ...(input.response !== undefined ? { response: input.response } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.status !== undefined
            ? { status: input.status as NodeStatus }
            : {}),
          ...(input.position
            ? { position: { x: input.position.x, y: input.position.y } }
            : {}),
          ...(input.metadata !== undefined
            ? { metadata: input.metadata as Prisma.InputJsonValue }
            : {}),
          ...(input.llmModel !== undefined ? { llmModel: input.llmModel } : {}),
          ...(input.llmTokens !== undefined
            ? { llmTokens: input.llmTokens }
            : {}),
        },
      });

      if (parentIds) {
        await tx.edge.deleteMany({
          where: { projectId: node.projectId, targetId: node.id },
        });

        if (parentIds.length) {
          await tx.edge.createMany({
            data: parentIds.map((sourceId) => ({
              projectId: node.projectId,
              sourceId,
              targetId: node.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      await tx.project.update({
        where: { id: node.projectId },
        data: { updatedAt: new Date() },
      });

      return node;
    });

    const finalParentIds = parentIds
      ? parentIds
      : (
          await this.prisma.edge.findMany({
            where: { projectId: updated.projectId, targetId: updated.id },
            select: { sourceId: true },
          })
        ).map((e) => e.sourceId);

    return {
      success: true,
      data: toProjectNode({ node: updated, parentIds: finalParentIds }),
      message: 'Node updated',
    };
  }

  async delete(id: string): Promise<void> {
    const node = await this.prisma.node.findFirst({
      where: { id, deletedAt: null },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.edge.deleteMany({
        where: {
          projectId: node.projectId,
          OR: [{ sourceId: id }, { targetId: id }],
        },
      });
      await tx.node.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.project.update({
        where: { id: node.projectId },
        data: { nodeCount: { decrement: 1 } },
      });
    });
  }
}
