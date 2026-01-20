import { UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { NodesService } from '../nodes/nodes.service';
import { ProjectsService } from '../projects/projects.service';
import {
  CreateNodeDto,
  DeleteNodeDto,
  JoinProjectDto,
  MoveCursorDto,
  UpdateNodeDto,
} from './dto/collaboration.dto';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { CollaborationService } from './collaboration.service';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseCookieHeader = (
  value: string | undefined,
): Record<string, string> => {
  if (!value) return {};
  const result: Record<string, string> = {};
  const parts = value.split(';');
  for (const part of parts) {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    if (!rawKey) continue;
    const rawValue = rawValueParts.join('=');
    if (!rawValue) continue;
    try {
      result[rawKey] = decodeURIComponent(rawValue);
    } catch {
      result[rawKey] = rawValue;
    }
  }
  return result;
};

const extractToken = (client: Socket): string | undefined => {
  const authToken = isRecord(client.handshake.auth)
    ? client.handshake.auth.token
    : undefined;

  const headers = isRecord(client.handshake.headers)
    ? client.handshake.headers
    : undefined;

  const headerAuth = headers ? headers.authorization : undefined;

  const raw =
    typeof authToken === 'string'
      ? authToken
      : typeof headerAuth === 'string'
        ? headerAuth
        : undefined;

  if (raw) {
    if (raw.startsWith('Bearer ')) {
      const [, token] = raw.split(' ');
      return token;
    }

    return raw;
  }

  const cookieHeader = headers ? headers.cookie : undefined;
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim())
    return undefined;

  const cookies = parseCookieHeader(cookieHeader);
  const cookieToken = cookies.access_token ?? cookies.accessToken;

  return typeof cookieToken === 'string' ? cookieToken : undefined;
};

const getUser = (
  client: Socket,
): { id: string; username?: string; avatar?: string } => {
  const user = client.data.user as unknown;
  if (!isRecord(user)) throw new WsException('Unauthorized');

  const sub = user.sub;
  const id = user.id;
  const userId =
    typeof sub === 'string' && sub.length > 0
      ? sub
      : typeof id === 'string' && id.length > 0
        ? id
        : undefined;

  if (!userId) throw new WsException('Unauthorized');

  return {
    id: userId,
    username: typeof user.username === 'string' ? user.username : undefined,
    avatar: typeof user.avatar === 'string' ? user.avatar : undefined,
  };
};

const getJoinedProjectIds = (client: Socket): string[] => {
  const value = client.data.projectIds as unknown;
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );
};

const setJoinedProjectIds = (client: Socket, projectIds: string[]) => {
  client.data.projectIds = projectIds;
};

const roomForProject = (projectId: string) => `project:${projectId}`;

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class CollaborationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly presenceByProject = new Map<
    string,
    Map<string, { userId: string; username?: string; avatar?: string }>
  >();

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly jwtService: JwtService,
    private readonly projectsService: ProjectsService,
    private readonly nodesService: NodesService,
  ) {}

  afterInit(server: Server) {
    this.collaborationService.bindServer(server);
  }

  async handleConnection(client: Socket) {
    const token = extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(token);
      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (() => {
      try {
        return getUser(client);
      } catch {
        return undefined;
      }
    })();

    if (!user) return;

    const projects = getJoinedProjectIds(client);
    const leftAt = new Date().toISOString();

    for (const projectId of projects) {
      const projectPresence = this.presenceByProject.get(projectId);
      projectPresence?.delete(client.id);
      if (projectPresence && projectPresence.size === 0) {
        this.presenceByProject.delete(projectId);
      }

      this.collaborationService.emitToProject(
        projectId,
        'user:left',
        { userId: user.id, leftAt },
        client.id,
      );

      this.collaborationService.emitToProject(
        projectId,
        'user-left',
        { userId: user.id, leftAt },
        client.id,
      );
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('join-project')
  async handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinProjectDto,
  ) {
    const projectId = dto.projectId;
    const user = getUser(client);

    await this.projectsService.assertUserHasAccess(projectId, user.id);

    const room = roomForProject(projectId);
    await client.join(room);

    const existing = getJoinedProjectIds(client);
    if (!existing.includes(projectId)) {
      setJoinedProjectIds(client, [...existing, projectId]);
    }

    const joinedAt = new Date().toISOString();

    const projectPresence = this.presenceByProject.get(projectId) ?? new Map();
    projectPresence.set(client.id, {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
    });
    this.presenceByProject.set(projectId, projectPresence);

    const users = Array.from(projectPresence.values());
    client.emit('users:current', { users, timestamp: joinedAt });

    this.collaborationService.emitToProject(
      projectId,
      'user:joined',
      {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        joinedAt,
      },
      client.id,
    );

    this.collaborationService.emitToProject(
      projectId,
      'user-joined',
      {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        joinedAt,
      },
      client.id,
    );

    return { ok: true };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('cursor:move')
  handleMoveCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MoveCursorDto,
  ) {
    const user = getUser(client);

    this.collaborationService.emitToProject(
      dto.projectId,
      'cursor:moved',
      {
        userId: user.id,
        cursor: {
          x: dto.x,
          y: dto.y,
          nodeId: dto.nodeId,
        },
      },
      client.id,
    );

    this.collaborationService.emitToProject(
      dto.projectId,
      'cursor-update',
      {
        userId: user.id,
        cursor: {
          x: dto.x,
          y: dto.y,
          nodeId: dto.nodeId,
        },
      },
      client.id,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('move-cursor')
  handleMoveCursorLegacy(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MoveCursorDto,
  ) {
    this.handleMoveCursor(client, dto);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('node:update')
  handleUpdateNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateNodeDto,
  ) {
    this.collaborationService.emitToProject(
      dto.projectId,
      'node:updated',
      {
        nodeId: dto.nodeId,
        updates: dto.data,
        updatedAt: new Date().toISOString(),
      },
      client.id,
    );

    this.collaborationService.emitToProject(
      dto.projectId,
      'node-updated',
      {
        nodeId: dto.nodeId,
        updates: dto.data,
        updatedAt: new Date().toISOString(),
      },
      client.id,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('update-node')
  handleUpdateNodeLegacy(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateNodeDto,
  ) {
    this.handleUpdateNode(client, dto);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('node:create')
  async handleCreateNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CreateNodeDto,
  ) {
    const user = getUser(client);

    await this.projectsService.assertUserHasAccess(dto.projectId, user.id);

    let node: {
      id: string;
      prompt: string;
      response: string | null;
      summary: string | null;
      status: string;
      position: { x: number; y: number };
      parentIds?: string[];
      metadata?: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
    } | null = null;

    try {
      const created = await this.nodesService.create(dto.projectId, {
        id: dto.id,
        prompt: dto.prompt,
        position: dto.position,
        parentIds: dto.parentIds,
      });

      node = created.data;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        dto.id
      ) {
        const now = new Date().toISOString();
        node = {
          id: dto.id,
          prompt: dto.prompt,
          response: null,
          summary: null,
          status: 'IDLE',
          position: dto.position,
          parentIds: dto.parentIds ?? [],
          metadata: {},
          createdAt: now,
          updatedAt: now,
        };
      } else {
        throw error;
      }
    }

    if (!node) {
      throw new WsException('Node create failed');
    }

    this.collaborationService.emitToProject(
      dto.projectId,
      'node:created',
      {
        node,
      },
      client.id,
    );

    return { success: true, data: node };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('node:delete')
  async handleDeleteNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: DeleteNodeDto,
  ) {
    const user = getUser(client);

    await this.projectsService.assertUserHasAccess(dto.projectId, user.id);

    await this.nodesService.delete(dto.nodeId);

    this.collaborationService.emitToProject(
      dto.projectId,
      'node:deleted',
      {
        nodeId: dto.nodeId,
        deletedAt: new Date().toISOString(),
      },
      client.id,
    );

    return { ok: true };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const projects = getJoinedProjectIds(client);
    const users = projects.flatMap((projectId) =>
      Array.from(this.presenceByProject.get(projectId)?.values() ?? []),
    );

    client.emit('pong', {
      timestamp: new Date().toISOString(),
      users,
    });
  }
}
