import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Edge } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { CreateEdgeDto } from './dto/create-edge.dto';
import type { ProjectEdge } from './types/edge.type';

@Injectable()
export class EdgesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { projectId: string; page: number; limit: number }) {
    const { projectId, page, limit } = params;

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const where: Prisma.EdgeWhereInput = {
      projectId,
    };

    const [total, edges] = await Promise.all([
      this.prisma.edge.count({ where }),
      this.prisma.edge.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      success: true,
      data: edges.map(this.toProjectEdge),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private toProjectEdge(edge: Edge): ProjectEdge {
    return {
      id: edge.id,
      projectId: edge.projectId,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      createdAt: edge.createdAt.toISOString(),
    };
  }

  async create(
    projectId: string,
    input: CreateEdgeDto,
  ): Promise<{ success: true; data: ProjectEdge; message: string }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (input.sourceId === input.targetId) {
      throw new BadRequestException('Edge sourceId and targetId must differ');
    }

    const [sourceNode, targetNode] = await Promise.all([
      this.prisma.node.findFirst({
        where: { id: input.sourceId, projectId, deletedAt: null },
      }),
      this.prisma.node.findFirst({
        where: { id: input.targetId, projectId, deletedAt: null },
      }),
    ]);

    if (!sourceNode || !targetNode) {
      throw new NotFoundException('Node not found');
    }

    try {
      const created = await this.prisma.edge.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          projectId,
          sourceId: input.sourceId,
          targetId: input.targetId,
        },
      });

      return {
        success: true,
        data: this.toProjectEdge(created),
        message: 'Liaison créée avec succès',
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const code = (error as Error & { code?: string }).code;
        if (code === 'P2002') {
          throw new BadRequestException('Edge already exists');
        }
      }

      throw error;
    }
  }

  async delete(edgeId: string): Promise<void> {
    const existing = await this.prisma.edge.findUnique({
      where: { id: edgeId },
    });
    if (!existing) {
      throw new NotFoundException('Edge not found');
    }

    await this.prisma.edge.delete({ where: { id: edgeId } });
  }
}
