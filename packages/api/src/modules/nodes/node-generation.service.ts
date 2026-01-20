import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type NodeStatus } from '@prisma/client';
import { streamText } from 'ai';
import { PrismaService } from '../../common/database/prisma.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { LlmService } from '../llm/llm.service';
import { NodeGenerationStreamsService } from './node-generation-streams.service';
import type { GenerateNodeDto } from './dto/generate-node.dto';

type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OrchestrationJson = {
  logicalRole?: string;
  pinned?: boolean;
  source?: {
    provenance?: { uri?: string; kind?: string; title?: string };
    excerpts?: { text?: string; startLine?: number; endLine?: number }[];
    summary?: string;
  };
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOrchestrationFromMetadata(metadata: unknown): OrchestrationJson {
  if (!isPlainObject(metadata)) return {};
  const customData = metadata['customData'];
  if (!isPlainObject(customData)) return {};
  const orchestration = customData['orchestration'];
  return isPlainObject(orchestration)
    ? (orchestration as OrchestrationJson)
    : {};
}

function formatSourceContext(params: {
  nodeId: string;
  orchestration: OrchestrationJson;
  fallbackSummary: string | null;
}): string {
  const uri = params.orchestration.source?.provenance?.uri;
  const title = params.orchestration.source?.provenance?.title;
  const kind = params.orchestration.source?.provenance?.kind;

  const header = [
    'SOURCE',
    title ? `title: ${title}` : null,
    kind ? `kind: ${kind}` : null,
    uri ? `uri: ${uri}` : `nodeId: ${params.nodeId}`,
  ]
    .filter(Boolean)
    .join('\n');

  const excerptTexts = (params.orchestration.source?.excerpts ?? [])
    .map((ex) => {
      const startLine = typeof ex.startLine === 'number' ? ex.startLine : null;
      const endLine = typeof ex.endLine === 'number' ? ex.endLine : null;
      const range =
        startLine !== null && endLine !== null
          ? ` (L${startLine}-L${endLine})`
          : '';
      return ex.text ? `- ${ex.text}${range}` : null;
    })
    .filter((v): v is string => typeof v === 'string');

  const summary =
    params.orchestration.source?.summary ?? params.fallbackSummary;

  return [
    header,
    summary ? `summary: ${summary}` : null,
    excerptTexts.length ? `excerpts:\n${excerptTexts.join('\n')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function formatArtifactContext(params: {
  nodeId: string;
  pinned: boolean;
  response: string | null;
  summary: string | null;
}): string {
  const base = [`ARTIFACT nodeId: ${params.nodeId}`];

  if (params.pinned && params.response) {
    return [...base, 'content:', params.response].join('\n');
  }

  if (params.summary) {
    return [...base, 'summary:', params.summary].join('\n');
  }

  if (params.response) {
    const preview = params.response.slice(0, 600);
    return [...base, 'preview:', preview].join('\n');
  }

  return base.join('\n');
}

type StreamTextModel = Parameters<typeof streamText>[0]['model'];

@Injectable()
export class NodeGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly streams: NodeGenerationStreamsService,
    private readonly collaboration: CollaborationService,
  ) {}

  async startGeneration(nodeId: string, input: GenerateNodeDto) {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    const modelId = input.model;
    const temperature = input.temperature ?? 0.7;
    const maxTokens = input.maxTokens ?? 2000;

    const { streamId } = this.streams.create(nodeId);

    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: 'GENERATING',
        llmModel: modelId,
        metadata: {
          ...(node.metadata as Prisma.InputJsonObject | null),
          model: modelId,
          temperature,
        },
      },
    });

    void this.runGeneration({
      nodeId,
      streamId,
      modelId,
      temperature,
      maxTokens,
    });

    return {
      success: true,
      data: {
        nodeId,
        streamId,
        status: 'GENERATING' as NodeStatus,
        startedAt: new Date().toISOString(),
      },
      message: 'Generation started',
    };
  }

  getStream(streamId: string) {
    return this.streams.get(streamId);
  }

  async cancel(nodeId: string) {
    const streamId = this.streams.findStreamIdByNodeId(nodeId);

    if (streamId) {
      this.streams.getAbortController(streamId)?.abort();
      this.streams.complete(streamId);
    }

    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.prisma.node.update({
      where: { id: nodeId },
      data: { status: 'IDLE' },
    });

    return {
      success: true,
      data: {
        nodeId,
        status: 'IDLE' as NodeStatus,
        cancelledAt: new Date().toISOString(),
      },
      message: 'Generation cancelled',
    };
  }

  async cascade(nodeId: string) {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null },
      select: { projectId: true },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    const descendants = await this.getDescendants({
      projectId: node.projectId,
      rootNodeId: nodeId,
    });

    if (!descendants.length) {
      return {
        success: true,
        data: {
          startedAt: new Date().toISOString(),
          affectedNodes: [],
          totalAffected: 0,
        },
        message: 'Cascade update started',
      };
    }

    await this.prisma.node.updateMany({
      where: {
        id: { in: descendants },
        deletedAt: null,
        NOT: { status: 'GENERATING' },
      },
      data: { status: 'STALE' },
    });

    return {
      success: true,
      data: {
        startedAt: new Date().toISOString(),
        affectedNodes: descendants.map((id) => ({
          nodeId: id,
          status: 'STALE' as NodeStatus,
        })),
        totalAffected: descendants.length,
      },
      message: 'Cascade update started',
    };
  }

  private async runGeneration(params: {
    nodeId: string;
    streamId: string;
    modelId: string;
    temperature: number;
    maxTokens: number;
  }): Promise<void> {
    const { nodeId, streamId, modelId, temperature, maxTokens } = params;

    const abortController = this.streams.getAbortController(streamId);
    if (!abortController) return;

    let projectId: string | null = null;

    try {
      const node = await this.prisma.node.findFirst({
        where: { id: nodeId, deletedAt: null },
      });
      if (!node) {
        throw new NotFoundException('Node not found');
      }

      projectId = node.projectId;
      if (!projectId) {
        throw new BadRequestException('Project not found');
      }

      const project = await this.prisma.project.findFirst({
        where: { id: node.projectId, deletedAt: null },
        select: { systemPrompt: true },
      });

      const messages = await this.buildContextMessages(nodeId);

      const systemPrompt = project?.systemPrompt
        ? String(project.systemPrompt)
        : undefined;

      const model = this.llm.getModel(modelId) as StreamTextModel;

      const result = streamText({
        model,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        temperature,
        maxOutputTokens: maxTokens,
        abortSignal: abortController.signal,
      });

      let full = '';
      let emitted = 0;

      for await (const delta of result.textStream) {
        if (abortController.signal.aborted) {
          return;
        }
        const text = String(delta);
        full += text;

        emitted += 1;
        const progress = Math.min(
          0.99,
          emitted / Math.max(1, Math.ceil(maxTokens / 20)),
        );

        this.streams.emit(streamId, { chunk: text, progress });
        this.collaboration.emitToProject(projectId, 'node:streaming', {
          nodeId,
          chunk: text,
          progress,
          timestamp: new Date().toISOString(),
        });
      }

      const tokens =
        'usage' in result &&
        typeof (result as unknown as { usage?: { totalTokens?: unknown } })
          .usage?.totalTokens === 'number'
          ? (result as unknown as { usage: { totalTokens: number } }).usage
              .totalTokens
          : null;

      const summary = await this.summarize({
        modelId,
        content: full,
        abortController,
      });

      await this.prisma.node.update({
        where: { id: nodeId },
        data: {
          response: full,
          summary,
          status: 'COMPLETED',
          llmModel: modelId,
          llmTokens: typeof tokens === 'number' ? tokens : null,
        },
      });

      this.streams.emit(streamId, {
        done: true,
        summary,
        tokens: typeof tokens === 'number' ? tokens : null,
      });
      this.collaboration.emitToProject(projectId, 'node:streaming', {
        nodeId,
        done: true,
        summary,
        tokens: typeof tokens === 'number' ? tokens : null,
        timestamp: new Date().toISOString(),
      });
      this.streams.complete(streamId);
    } catch (error) {
      await this.prisma.node
        .update({
          where: { id: nodeId },
          data: { status: 'ERROR' },
        })
        .catch(() => null);

      this.streams.emit(streamId, { done: true, summary: null, tokens: null });
      if (projectId) {
        this.collaboration.emitToProject(projectId, 'node:streaming', {
          nodeId,
          done: true,
          summary: null,
          tokens: null,
          timestamp: new Date().toISOString(),
        });
      }
      this.streams.complete(streamId);

      if (error instanceof BadRequestException) {
        throw error;
      }
    }
  }

  private async summarize(params: {
    modelId: string;
    content: string;
    abortController: AbortController;
  }): Promise<string | null> {
    const { modelId, content, abortController } = params;

    if (!content.trim()) return null;

    try {
      const model = this.llm.getModel(modelId) as StreamTextModel;

      const result = streamText({
        model,
        system:
          'You are an expert in synthesis. Create an ultra-concise summary (1 sentence) in English.',
        messages: [{ role: 'user', content }],
        temperature: 0.3,
        maxOutputTokens: 80,
        abortSignal: abortController.signal,
      });

      let summary = '';
      for await (const delta of result.textStream) {
        summary += String(delta);
      }

      return summary.trim() ? summary.trim() : null;
    } catch {
      return null;
    }
  }

  private async buildContextMessages(nodeId: string): Promise<LLMMessage[]> {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    const parents = await this.prisma.edge.findMany({
      where: { projectId: node.projectId, targetId: nodeId },
      select: { sourceId: true },
    });

    const parentIds = parents.map((p) => p.sourceId);

    const messages: LLMMessage[] = [];

    if (parentIds.length === 1) {
      messages.push(
        ...(await this.buildParentContext(parentIds[0], node.projectId)),
      );
    } else if (parentIds.length > 1) {
      for (let i = 0; i < parentIds.length; i += 1) {
        const parentId = parentIds[i];
        const parentNode = await this.prisma.node.findFirst({
          where: { id: parentId, deletedAt: null },
        });
        const ctx = await this.buildParentContext(parentId, node.projectId);
        const label = parentNode?.prompt?.slice(0, 30) || `Branch ${i + 1}`;
        const contextText = ctx
          .map(
            (m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
          )
          .join('\n\n');

        messages.push({
          role: 'user',
          content: `--- Context ${label} ---\n${contextText}`,
        });
      }
    }

    messages.push({ role: 'user', content: node.prompt });

    return messages;
  }

  private async buildParentContext(
    nodeId: string,
    projectId: string,
  ): Promise<LLMMessage[]> {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null, projectId },
    });
    if (!node) return [];

    const parents = await this.prisma.edge.findMany({
      where: { projectId, targetId: nodeId },
      select: { sourceId: true },
    });
    const parentIds = parents.map((p) => p.sourceId);

    const messages: LLMMessage[] = [];

    if (parentIds.length === 1) {
      messages.push(
        ...(await this.buildParentContext(parentIds[0], projectId)),
      );
    } else if (parentIds.length > 1) {
      for (let i = 0; i < parentIds.length; i += 1) {
        const parentId = parentIds[i];
        const parentNode = await this.prisma.node.findFirst({
          where: { id: parentId, deletedAt: null, projectId },
        });
        const ctx = await this.buildParentContext(parentId, projectId);
        const label = parentNode?.prompt?.slice(0, 30) || `Branch ${i + 1}`;
        const contextText = ctx
          .map(
            (m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
          )
          .join('\n\n');

        messages.push({
          role: 'user',
          content: `--- Context ${label} ---\n${contextText}`,
        });
      }
    }

    const orchestration = readOrchestrationFromMetadata(node.metadata);
    const pinned = Boolean(orchestration.pinned);
    const role =
      typeof orchestration.logicalRole === 'string'
        ? orchestration.logicalRole
        : null;

    if (role === 'source') {
      messages.push({
        role: 'user',
        content: formatSourceContext({
          nodeId,
          orchestration,
          fallbackSummary: node.summary ? String(node.summary) : null,
        }),
      });
      return messages;
    }

    if (role === 'artifact') {
      messages.push({
        role: 'user',
        content: formatArtifactContext({
          nodeId,
          pinned,
          response: node.response ? String(node.response) : null,
          summary: node.summary ? String(node.summary) : null,
        }),
      });
      return messages;
    }

    if (node.prompt) {
      messages.push({ role: 'user', content: node.prompt });
    }

    if (node.response) {
      messages.push({ role: 'assistant', content: node.response });
    }

    return messages;
  }

  private async getDescendants(params: {
    projectId: string;
    rootNodeId: string;
  }): Promise<string[]> {
    const { projectId, rootNodeId } = params;

    const descendants: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [rootNodeId];

    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      if (visited.has(current)) continue;
      visited.add(current);

      const edges = await this.prisma.edge.findMany({
        where: { projectId, sourceId: current },
        select: { targetId: true },
      });

      for (const edge of edges) {
        if (!visited.has(edge.targetId)) {
          descendants.push(edge.targetId);
          queue.push(edge.targetId);
        }
      }
    }

    return descendants;
  }
}
