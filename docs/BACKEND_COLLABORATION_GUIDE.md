# Guide Collaboration WebSocket NonLinear

> **Guide complet de l'architecture WebSocket temps réel pour la collaboration multi-utilisateur**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Architecture WebSocket](#2-architecture-websocket)
3. [NestJS Gateway Setup](#3-nestjs-gateway-setup)
4. [Gestion de la Présence](#4-gestion-de-la-présence)
5. [Événements Temps Réel](#5-événements-temps-réel)
6. [Synchronisation des Curseurs](#6-synchronisation-des-curseurs)
7. [Synchronisation des Nœuds](#7-synchronisation-des-nœuds)
8. [Optimisations](#8-optimisations)
9. [Sécurité WebSocket](#9-sécurité-websocket)
10. [Frontend Integration](#10-integration-frontend)

---

## 1. Introduction

### Stack Technique

```
Framework : Socket.io (NestJS @nestjs/websockets)
Transport : WebSocket (fallback: HTTP long-polling)
Adapter  : Socket.io Adapter
Redis     : Pub/Sub pour scaling multi-instances
Database  : PostgreSQL (sessions, curseurs)
```

### Objectifs

1. **Présence** : Savoir qui est connecté et actif
2. **Curseurs** : Synchroniser les positions des curseurs en temps réel
3. **Nœuds** : Synchroniser les créations/modifications/suppressions
4. **Événements** : Notifier en temps réel des changements
5. **Performance** : < 50ms de latence pour les événements
6. **Scalabilité** : Supporter 100+ utilisateurs simultanés par projet

---

## 2. Architecture WebSocket

### 2.1 Architecture Globale

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Next.js)                │
│                                                 │
│  ┌───────────────┐   ┌───────────────┐   │
│  │ Project A    │   │ Project B    │   │
│  │               │   │               │   │
│  └───────┬───────┴───────┬───────┘   │
│          │                   │           │
└──────────┼───────────────────┼───────────┘
           │                   │
     ┌─────┴─────────┐     │         │
     │   WebSocket    │◄────┼─────────┐     │
     │   Gateway      │◄────┼─────────┐     │
     └─────────┬───────┘     │         │
               │             │         │
     ┌─────────┴───────┐   │ ┌───────┴───────┐
     │   Instance 1   │   │   Instance 2   │
     │   (NestJS)     │   │   (NestJS)     │
     │   ┌───────────┐ │   │   └───────────────┐
     │   │  Presence  │ │   │                 │
     │   │  Service   │ │   │                 │
     │   └──────────────┘ │   │   └───────────────┐
     │                 │   │                 │
     │   ┌───────────┐ │   │   ┌───────────────┐
     │   │  Projects  │ │   │   │  Projects   │ │
     │   │  Service   │ │   │   │  Service    │ │
     │   └──────────────┘ │   │   └───────────────┘
     └─────────────────┘   │   └─────────────────┘
               │
               ▼
        ┌───────────┐
        │  Redis     │ (Pub/Sub multi-instance)
        │  (Pub/Sub) │
        └───────────┘
               ▼
        ┌───────────┐
        │ PostgreSQL │ (Sessions, Curseurs)
        └───────────┘
```

### 2.2 Namespace par Projet

```
ws://api.nonlinear.app/projects/:projectId

- Chaque projet = namespace WebSocket isolé
- Les utilisateurs rejoignent un projet spécifique
- Les événements sont broadcastés uniquement aux membres du projet
```

### 2.3 Flow de Connection

```
1. Client Frontend
   └─> WebSocket Connection
       └─> Authentification (JWT token)
       └─> Join Project (projectId)

2. Server NestJS
   └─> Valider JWT token
       └─> Valider accès au projet
       └─> Créer session utilisateur
       └─> Notifier autres membres (user:joined)
       └─> Envoyer liste des membres connectés

3. Collaborateurs
   └─> Recevoir événement user:joined
       └─> Mettre à jour la liste de présence
```

---

## 3. NestJS Gateway Setup

### 3.1 Création du Gateway

```typescript
// apps/api/src/modules/collaboration/collaboration.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: 'projects',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly logger: Logger,
    private readonly collaborationService: CollaborationService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    try {
      // Extraire les query params et auth token
      const projectId = client.handshake.query.projectId as string;
      const token = client.handshake.auth.token as string;

      if (!projectId || !token) {
        this.logger.warn('Missing projectId or token');
        client.disconnect();
        return;
      }

      // Valider le token et récupérer l'utilisateur
      const user = await this.collaborationService.authenticateUser(token);
      if (!user) {
        this.logger.warn('Invalid token');
        client.disconnect();
        return;
      }

      // Vérifier l'accès au projet
      const hasAccess = await this.collaborationService.hasAccessToProject(
        projectId,
        user.id,
      );
      if (!hasAccess) {
        this.logger.warn(`User ${user.id} has no access to project ${projectId}`);
        client.disconnect();
        return;
      }

      // Rejoindre le projet
      await this.collaborationService.joinProject(
        projectId,
        user.id,
        user.username,
        user.avatar,
        client.id,
      );

      // Join room du projet
      client.join(`project:${projectId}`);

      // Notifier les autres membres
      client.to(`project:${projectId}`).emit('user:joined', {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        joinedAt: new Date(),
      });

      // Envoyer l'état initial au nouvel utilisateur
      const currentUsers = await this.collaborationService.getProjectUsers(projectId);
      client.emit('users:current', {
        users: currentUsers,
      });

      this.logger.log(`User ${user.id} joined project ${projectId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    try {
      const projectId = client.handshake.query.projectId as string;

      if (!projectId) return;

      // Retirer l'utilisateur du projet
      const userId = await this.collaborationService.leaveProject(
        client.id,
        projectId,
      );

      if (userId && projectId) {
        // Notifier les autres membres
        client.to(`project:${projectId}`).emit('user:left', {
          userId,
          leftAt: new Date(),
        });

        this.logger.log(`User ${userId} left project ${projectId}`);
      }
    } catch (error) {
      this.logger.error('Disconnect error:', error);
    }
  }

  @SubscribeMessage('cursor:move')
  async handleCursorMove(
    client: Socket,
    @MessageBody() data: CursorMoveDto,
  ) {
    try {
      const projectId = client.handshake.query.projectId as string;
      const userId = await this.collaborationService.getUserIdBySocket(client.id);

      if (!userId || !projectId) return;

      // Mettre à jour la position du curseur en cache
      await this.collaborationService.updateCursor(
        projectId,
        userId,
        data.x,
        data.y,
        data.nodeId,
      );

      // Broadcast aux autres utilisateurs (pas à l'émetteur)
      client.to(`project:${projectId}`).emit('cursor:moved', {
        userId,
        cursor: data,
        timestamp: new Date(),
      });

      this.logger.debug(`Cursor moved by ${userId} in project ${projectId}`);
    } catch (error) {
      this.logger.error('Cursor move error:', error);
    }
  }

  @SubscribeMessage('node:create')
  async handleNodeCreate(
    client: Socket,
    @MessageBody() data: CreateNodeDto,
  ) {
    try {
      const projectId = client.handshake.query.projectId as string;
      const userId = await this.collaborationService.getUserIdBySocket(client.id);

      if (!userId || !projectId) return;

      // Vérifier la permission de création
      const hasPermission = await this.collaborationService.hasPermission(
        projectId,
        userId,
        'EDIT',
      );
      if (!hasPermission) {
        client.emit('error', { code: 'PERMISSION_DENIED', message: 'No permission to create nodes' });
        return;
      }

      // Créer le nœud via service
      const node = await this.collaborationService.createNode(
        projectId,
        userId,
        data,
      );

      // Broadcast à tous les membres (y compris l'émetteur pour confirmation)
      this.server.to(`project:${projectId}`).emit('node:created', {
        node,
        createdById: userId,
        createdAt: new Date(),
      });

      this.logger.debug(`Node created by ${userId} in project ${projectId}`);
    } catch (error) {
      this.logger.error('Node create error:', error);
      client.emit('error', { code: 'NODE_CREATE_ERROR', message: 'Failed to create node' });
    }
  }

  @SubscribeMessage('node:update')
  async handleNodeUpdate(
    client: Socket,
    @MessageBody() data: UpdateNodeDto,
  ) {
    try {
      const projectId = client.handshake.query.projectId as string;
      const userId = await this.collaborationService.getUserIdBySocket(client.id);

      if (!userId || !projectId) return;

      // Vérifier la permission de modification
      const hasPermission = await this.collaborationService.hasPermission(
        projectId,
        userId,
        'EDIT',
      );
      if (!hasPermission) {
        client.emit('error', { code: 'PERMISSION_DENIED', message: 'No permission to update nodes' });
        return;
      }

      // Mettre à jour le nœud via service
      const node = await this.collaborationService.updateNode(
        data.nodeId,
        userId,
        data.updates,
      );

      // Broadcast à tous les membres
      this.server.to(`project:${projectId}`).emit('node:updated', {
        nodeId: data.nodeId,
        updates: data.updates,
        updatedById: userId,
        updatedAt: new Date(),
      });

      this.logger.debug(`Node ${data.nodeId} updated by ${userId} in project ${projectId}`);
    } catch (error) {
      this.logger.error('Node update error:', error);
      client.emit('error', { code: 'NODE_UPDATE_ERROR', message: 'Failed to update node' });
    }
  }

  @SubscribeMessage('node:delete')
  async handleNodeDelete(
    client: Socket,
    @MessageBody() data: { nodeId: string },
  ) {
    try {
      const projectId = client.handshake.query.projectId as string;
      const userId = await this.collaborationService.getUserIdBySocket(client.id);

      if (!userId || !projectId) return;

      // Vérifier la permission de suppression
      const hasPermission = await this.collaborationService.hasPermission(
        projectId,
        userId,
        'EDIT',
      );
      if (!hasPermission) {
        client.emit('error', { code: 'PERMISSION_DENIED', message: 'No permission to delete nodes' });
        return;
      }

      // Supprimer le nœud via service
      await this.collaborationService.deleteNode(data.nodeId, userId);

      // Broadcast à tous les membres
      this.server.to(`project:${projectId}`).emit('node:deleted', {
        nodeId: data.nodeId,
        deletedById: userId,
        deletedAt: new Date(),
      });

      this.logger.debug(`Node ${data.nodeId} deleted by ${userId} in project ${projectId}`);
    } catch (error) {
      this.logger.error('Node delete error:', error);
      client.emit('error', { code: 'NODE_DELETE_ERROR', message: 'Failed to delete node' });
    }
  }

  @SubscribeMessage('node:generate:chunk')
  async handleNodeGenerateChunk(
    client: Socket,
    @MessageBody() data: { nodeId: string; chunk: string; progress: number },
  ) {
    try {
      const projectId = client.handshake.query.projectId as string;
      const userId = await this.collaborationService.getUserIdBySocket(client.id);

      if (!userId || !projectId) return;

      // Broadcast du chunk aux autres utilisateurs
      client.to(`project:${projectId}`).emit('node:streaming', {
        nodeId: data.nodeId,
        chunk: data.chunk,
        progress: data.progress,
        generatedById: userId,
        timestamp: new Date(),
      });

      this.logger.debug(`Node ${data.nodeId} streaming chunk (${data.progress * 100}%) by ${userId}`);
    } catch (error) {
      this.logger.error('Node streaming error:', error);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(client: Socket) {
    const projectId = client.handshake.query.projectId as string;
    
    // Envoyer pong avec les utilisateurs actifs (heartbeat)
    const users = await this.collaborationService.getProjectUsers(projectId);
    
    client.emit('pong', {
      timestamp: new Date(),
      users: users.length,
    });
  }
}
```

### 3.2 DTOs

```typescript
// apps/api/src/modules/collaboration/dto/cursor-move.dto.ts
export class CursorMoveDto {
  x: number;
  y: number;
  nodeId?: string;
  timestamp?: Date;
}

export class CreateNodeDto {
  prompt: string;
  position: { x: number; y: number };
  parentIds?: string[];
}

export class UpdateNodeDto {
  nodeId: string;
  updates: Partial<{
    prompt: string;
    response: string;
    summary: string;
    status: string;
    position: { x: number; y: number };
  }>;
}

export class UserJoinedDto {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: Date;
}

export class UserLeftDto {
  userId: string;
  leftAt: Date;
}

export class NodeCreatedDto {
  node: any;
  createdById: string;
  createdAt: Date;
}

export class NodeUpdatedDto {
  nodeId: string;
  updates: any;
  updatedById: string;
  updatedAt: Date;
}

export class NodeDeletedDto {
  nodeId: string;
  deletedById: string;
  deletedAt: Date;
}

export class NodeStreamingDto {
  nodeId: string;
  chunk: string;
  progress: number;
  generatedById: string;
  timestamp: Date;
}
```

---

## 4. Gestion de la Présence

### 4.1 Service de Collaboration

```typescript
// apps/api/src/modules/collaboration/collaboration.service.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/services/redis.service';
import { PrismaService } from '@nonlinear/database';
import { UserSession, ProjectRole } from '@nonlinear/database';

@Injectable()
export class CollaborationService {
  private readonly socketMap = new Map<string, string>(); // socketId -> userId
  private readonly projectUsersMap = new Map<string, Set<string>>(); // projectId -> Set<userId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticateUser(token: string): Promise<{ id: string; email: string; username: string; avatar: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        avatar: payload.avatar,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async hasAccessToProject(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId,
        userId,
        deletedAt: null,
      },
    });

    if (!membership) {
      // Vérifier si l'utilisateur est le propriétaire
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      return project?.ownerId === userId;
    }

    // Les rôles OWNER, ADMIN, EDITOR, MEMBER, VIEWER ont tous accès
    return true;
  }

  async hasPermission(
    projectId: string,
    userId: string,
    action: 'VIEW' | 'EDIT' | 'DELETE' | 'INVITE',
  ): Promise<boolean> {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId,
        userId,
        deletedAt: null,
      },
    });

    if (!membership) {
      // Vérifier si l'utilisateur est le propriétaire
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (project?.ownerId === userId) {
        return true; // Owner a tous les droits
      }

      return false;
    }

    const rolePermissions = {
      [ProjectRole.OWNER]: ['VIEW', 'EDIT', 'DELETE', 'INVITE'],
      [ProjectRole.ADMIN]: ['VIEW', 'EDIT', 'DELETE', 'INVITE'],
      [ProjectRole.EDITOR]: ['VIEW', 'EDIT'],
      [ProjectRole.MEMBER]: ['VIEW'],
      [ProjectRole.VIEWER]: ['VIEW'],
    };

    return rolePermissions[membership.role]?.includes(action) ?? false;
  }

  async joinProject(
    projectId: string,
    userId: string,
    username: string,
    avatar: string,
    socketId: string,
  ): Promise<void> {
    // Stocker la mapping socket -> user
    this.socketMap.set(socketId, userId);

    // Ajouter l'utilisateur au projet
    if (!this.projectUsersMap.has(projectId)) {
      this.projectUsersMap.set(projectId, new Set());
    }
    this.projectUsersMap.get(projectId).add(userId);

    // Créer/mettre à jour la session utilisateur
    await this.prisma.userSession.upsert({
      where: {
        projectId,
        userId,
      },
      update: {
        isActive: true,
        lastSeen: new Date(),
        cursor: null,
      },
      create: {
        projectId,
        userId,
        isActive: true,
        joinedAt: new Date(),
        lastSeen: new Date(),
        cursor: null,
      },
    });

    // Publier l'événement Redis (pour multi-instances)
    await this.redisService.publish(`project:${projectId}:user:joined`, {
      userId,
      username,
      avatar,
      socketId,
    });
  }

  async leaveProject(
    socketId: string,
    projectId: string,
  ): Promise<string | null> {
    // Récupérer l'utilisateur depuis le socket
    const userId = this.socketMap.get(socketId);
    if (!userId) return null;

    // Retirer le mapping
    this.socketMap.delete(socketId);

    // Retirer l'utilisateur du projet
    this.projectUsersMap.get(projectId)?.delete(userId);

    // Désactiver la session utilisateur
    await this.prisma.userSession.updateMany({
      where: {
        projectId,
        userId,
        socketId,
      },
      data: {
        isActive: false,
        lastSeen: new Date(),
      },
    });

    // Publier l'événement Redis
    await this.redisService.publish(`project:${projectId}:user:left`, {
      userId,
      socketId,
    });

    return userId;
  }

  async getUserIdBySocket(socketId: string): Promise<string> {
    const userId = this.socketMap.get(socketId);
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return userId;
  }

  async getProjectUsers(projectId: string): Promise<UserPresence[]> {
    // Récupérer les sessions actives du projet
    const sessions = await this.prisma.userSession.findMany({
      where: {
        projectId,
        isActive: true,
        lastSeen: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Actif dans les 5 dernières minutes
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return sessions.map(session => ({
      userId: session.user.id,
      username: session.user.username,
      avatar: session.user.avatar,
      cursor: session.cursor,
      lastSeen: session.lastSeen,
    }));
  }

  async updateCursor(
    projectId: string,
    userId: string,
    x: number,
    y: number,
    nodeId?: string,
  ): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        projectId,
        userId,
        isActive: true,
      },
      data: {
        cursor: { x, y, nodeId, timestamp: new Date() },
        lastSeen: new Date(),
      },
    });

    // Publier l'événement Redis
    await this.redisService.publish(`project:${projectId}:cursor:moved`, {
      userId,
      x,
      y,
      nodeId,
    });
  }

  async createNode(
    projectId: string,
    userId: string,
    data: CreateNodeDto,
  ): Promise<any> {
    // Créer le nœud via ProjectsService
    // (Ceci devrait déléguer au ProjectsService)
    // Pour simplifier, on le fait ici directement
    const node = await this.prisma.node.create({
      data: {
        projectId,
        prompt: data.prompt,
        position: data.position,
        status: 'IDLE',
      },
    });

    // Publier l'événement Redis
    await this.redisService.publish(`project:${projectId}:node:created`, {
      node,
      createdById: userId,
    });

    return node;
  }

  async updateNode(
    nodeId: string,
    userId: string,
    updates: any,
  ): Promise<any> {
    const node = await this.prisma.node.update({
      where: { id: nodeId },
      data: updates,
    });

    // Publier l'événement Redis
    await this.redisService.publish(`project:${projectId}:node:updated`, {
      nodeId,
      updates,
      updatedById: userId,
    });

    return node;
  }

  async deleteNode(nodeId: string, userId: string): Promise<void> {
    await this.prisma.node.delete({
      where: { id: nodeId },
    });

    // Publier l'événement Redis
    await this.redisService.publish(`project:${projectId}:node:deleted`, {
      nodeId,
      deletedById: userId,
    });
  }
}
```

### 4.2 Nettoyage des Sessions Inactives

```typescript
// apps/api/src/modules/collaboration/cron/cleanup-sessions.service.ts
import { Injectable, Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@nonlinear/database';
import { Logger } from '@nestjs/common';

@Injectable()
export class CleanupSessionsService {
  private readonly logger = new Logger(CleanupSessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Nettoyer les sessions inactives toutes les 5 minutes
  @Cron('0 */5 * * * *')
  async handleCleanup() {
    this.logger.log('Starting cleanup of inactive sessions...');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.prisma.userSession.updateMany({
      where: {
        lastSeen: {
          lt: fiveMinutesAgo,
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Cleaned up ${result.count} inactive sessions`);
  }

  // Nettoyer les sessions très anciennes (> 1 jour)
  @Cron('0 0 * * * *')
  async handleOldCleanup() {
    this.logger.log('Starting cleanup of old sessions...');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.userSession.deleteMany({
      where: {
        lastSeen: {
          lt: oneDayAgo,
        },
      },
    });

    this.logger.log(`Deleted ${result.count} old sessions`);
  }
}
```

---

## 5. Événements Temps Réel

### 5.1 Types d'Événements

#### user:joined
```json
{
  "userId": "clxuser123",
  "username": "johndoe",
  "avatar": "https://example.com/avatar.jpg",
  "joinedAt": "2026-01-03T10:30:00.000Z"
}
```

#### user:left
```json
{
  "userId": "clxuser123",
  "leftAt": "2026-01-03T10:35:00.000Z"
}
```

#### cursor:moved
```json
{
  "userId": "clxuser123",
  "cursor": {
    "x": 250.5,
    "y": 300.75,
    "nodeId": "clxnode456",
    "timestamp": "2026-01-03T10:30:05.000Z"
  },
  "timestamp": "2026-01-03T10:30:05.000Z"
}
```

#### node:created
```json
{
  "node": {
    "id": "clxnewnode789",
    "prompt": "Qu'est-ce que React ?",
    "position": { "x": 100, "y": 200 },
    "status": "IDLE",
    "createdAt": "2026-01-03T10:30:00.000Z"
  },
  "createdById": "clxuser123",
  "createdAt": "2026-01-03T10:30:00.000Z"
}
```

#### node:updated
```json
{
  "nodeId": "clxnode456",
  "updates": {
    "prompt": "Nouveau prompt",
    "status": "COMPLETED"
  },
  "updatedById": "clxuser123",
  "updatedAt": "2026-01-03T10:35:00.000Z"
}
```

#### node:deleted
```json
{
  "nodeId": "clxnode789",
  "deletedById": "clxuser123",
  "deletedAt": "2026-01-03T10:40:00.000Z"
}
```

#### node:streaming
```json
{
  "nodeId": "clxnode456",
  "chunk": "React est une bibliothèque",
  "progress": 0.15,
  "generatedById": "clxuser123",
  "timestamp": "2026-01-03T10:30:01.000Z"
}
```

### 5.2 Ordre de Priorité des Événements

1. **Haute priorité** : `user:joined`, `user:left`
2. **Moyenne priorité** : `node:created`, `node:deleted`, `node:updated`
3. **Haute fréquence** : `cursor:moved`
4. **Streaming** : `node:streaming` (priorité dynamique basée sur la progression)

---

## 6. Synchronisation des Curseurs

### 6.1 Optimisations de Curseurs

```typescript
// apps/api/src/modules/collaboration/services/cursor-sync.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';

interface Cursor {
  x: number;
  y: number;
  nodeId?: string;
  timestamp: number;
}

@Injectable()
export class CursorSyncService {
  private readonly cursorBuffer = new Map<string, Cursor>(); // userId -> Cursor
  private readonly debounceMs = 50; // 50ms de debounce

  constructor(private readonly redisService: RedisService) {}

  async updateCursor(
    projectId: string,
    userId: string,
    cursor: Omit<Cursor, 'timestamp'>,
  ): Promise<void> {
    // Bufferiser la position
    this.cursorBuffer.set(userId, {
      ...cursor,
      timestamp: Date.now(),
    });

    // Debounce : ne pas émettre à chaque frame
    // (Optimisation : limiter les événements à ~20/s par utilisateur)
    // Ici, on stocke simplement la dernière position pour la synchronisation

    await this.redisService.set(
      `cursor:${projectId}:${userId}`,
      { ...cursor, timestamp: Date.now() },
      30, // TTL 30s
    );
  }

  async getCursor(projectId: string, userId: string): Promise<Cursor | null> {
    return this.redisService.get(`cursor:${projectId}:${userId}`);
  }

  async getProjectCursors(projectId: string): Promise<Map<string, Cursor>> {
    // Récupérer tous les curseurs d'un projet
    const keys = await this.redisService.keys(`cursor:${projectId}:*`);
    const cursors = new Map<string, Cursor>();

    for (const key of keys) {
      const userId = key.split(':').pop();
      const cursor = await this.redisService.get(key);
      if (cursor) {
        cursors.set(userId, cursor);
      }
    }

    return cursors;
  }
}
```

### 6.2 Filtre de Changements Significatifs

```typescript
// Frontend : Debounce et throttle des événements cursor
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useCursorSync(projectId: string, userId: string) {
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const lastEmitRef = useRef<number>(0);
  const throttleMs = 50; // 50ms de throttle (20/s max)

  const emitCursorPosition = useCallback((x: number, y: number, nodeId?: string) => {
    const now = Date.now();

    // Throttle : ne pas émettre plus de 20x par seconde
    if (now - lastEmitRef.current < throttleMs) {
      return;
    }

    // Filtre : ne pas émettre si le changement est trop petit (< 5px)
    const dx = Math.abs(x - lastPositionRef.current.x);
    const dy = Math.abs(y - lastPositionRef.current.y);

    if (dx < 5 && dy < 5) {
      return;
    }

    socket.emit('cursor:move', { x, y, nodeId });
    lastPositionRef.current = { x, y };
    lastEmitRef.current = now;
  }, [projectId, userId]);

  return { emitCursorPosition };
}

// Utilisation dans un composant
function Canvas({ projectId, userId }) {
  const { emitCursorPosition } = useCursorSync(projectId, userId);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoordinates(e);
    emitCursorPosition(x, y);
  };

  return <canvas onMouseMove={handleMouseMove} />;
}
```

---

## 7. Synchronisation des Nœuds

### 7.1 CRDT (Conflict-Free Replicated Data Types)

Pour une collaboration parfaite, utiliser Yjs (CRDT) :

```typescript
// apps/api/src/modules/collaboration/services/crdt.service.ts
import * as Y from 'yjs';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class CrdtService {
  private readonly documentMap = new Map<string, Y.Doc>();

  constructor(private readonly redisService: RedisService) {}

  async getDocument(projectId: string): Promise<Y.Doc> {
    // Essayer de récupérer depuis le cache local
    if (this.documentMap.has(projectId)) {
      return this.documentMap.get(projectId);
    }

    // Récupérer depuis Redis
    const docState = await this.redisService.get(`crdt:${projectId}`);
    if (!docState) {
      // Créer un nouveau document
      const doc = new Y.Doc();
      this.documentMap.set(projectId, doc);
      return doc;
    }

    // Restaurer depuis le state
    const doc = new Y.Doc();
    Y.applyUpdate(doc, docState);

    this.documentMap.set(projectId, doc);
    return doc;
  }

  async updateDocument(
    projectId: string,
    updateFn: (doc: Y.Doc) => void,
  ): Promise<void> {
    const doc = await this.getDocument(projectId);

    // Appliquer la mise à jour de manière transactionnelle
    doc.transact(() => {
      updateFn(doc);
    });

    // Sauvegarder le state dans Redis
    await this.redisService.set(
      `crdt:${projectId}`,
      Y.encodeStateAsUpdate(doc),
      3600, // TTL 1h
    );
  }

  getNodeContent(doc: Y.Doc, nodeId: string): { prompt: string; response: string } {
    // Structure du document Yjs :
    // {
    //   nodes: {
    //     node-1: { prompt: "...", response: "..." },
    //     node-2: { prompt: "...", response: "..." },
    //   }
    // }
    const nodes = doc.get('nodes', Y.Map);

    if (!nodes.has(nodeId)) {
      return { prompt: '', response: '' };
    }

    const node = nodes.get(nodeId);
    return {
      prompt: node.get('prompt'),
      response: node.get('response'),
    };
  }
}
```

### 7.2 Synchronisation Hybride (CRDT + Events)

```typescript
// apps/api/src/modules/collaboration/services/node-sync.service.ts
import { Injectable } from '@nestjs/common';
import { CrdtService } from './crdt.service';
import { CollaborationGateway } from './collaboration.gateway';
import { PrismaService } from '@nonlinear/database';

@Injectable()
export class NodeSyncService {
  constructor(
    private readonly crdtService: CrdtService,
    private readonly prisma: PrismaService,
  ) {}

  async syncNodeUpdate(
    projectId: string,
    nodeId: string,
    userId: string,
    updates: any,
  ): Promise<void> {
    // 1. Mettre à jour le document CRDT
    await this.crdtService.updateDocument(projectId, (doc) => {
      const node = doc.get('nodes', Y.Map).get(nodeId);
      if (node) {
        for (const [key, value] of Object.entries(updates)) {
          node.set(key, value);
        }
      }
    });

    // 2. Persister dans PostgreSQL (pour le long terme)
    await this.prisma.node.update({
      where: { id: nodeId },
      data: updates,
    });

    // 3. L'événement WebSocket est géré par le Gateway
    // (broadcast automatique aux autres utilisateurs)
  }

  async syncNodeCreation(
    projectId: string,
    nodeId: string,
    userId: string,
    data: any,
  ): Promise<void> {
    // 1. Ajouter au document CRDT
    await this.crdtService.updateDocument(projectId, (doc) => {
      const nodes = doc.get('nodes', Y.Map);
      const node = new Y.Map();
      node.set('prompt', data.prompt);
      node.set('response', data.response || '');
      node.set('status', data.status || 'IDLE');
      node.set('createdAt', new Date());
      nodes.set(nodeId, node);
    });

    // 2. Persister dans PostgreSQL
    await this.prisma.node.create({
      data: {
        id: nodeId,
        projectId,
        ...data,
      },
    });

    // 3. L'événement WebSocket est géré par le Gateway
  }

  async syncNodeDeletion(
    projectId: string,
    nodeId: string,
    userId: string,
  ): Promise<void> {
    // 1. Retirer du document CRDT
    await this.crdtService.updateDocument(projectId, (doc) => {
      const nodes = doc.get('nodes', Y.Map);
      nodes.delete(nodeId);
    });

    // 2. Soft delete dans PostgreSQL
    await this.prisma.node.update({
      where: { id: nodeId },
      data: { deletedAt: new Date() },
    });

    // 3. L'événement WebSocket est géré par le Gateway
  }

  async syncNodeStreaming(
    projectId: string,
    nodeId: string,
    userId: string,
    chunk: string,
    progress: number,
  ): Promise<void> {
    // 1. Mettre à jour le document CRDT avec le chunk
    await this.crdtService.updateDocument(projectId, (doc) => {
      const nodes = doc.get('nodes', Y.Map);
      const node = nodes.get(nodeId);

      if (node) {
        const currentResponse = node.get('response', '');
        node.set('response', currentResponse + chunk);
      }
    });

    // 2. L'événement WebSocket est géré par le Gateway
    // (broadcast du chunk en temps réel)
  }
}
```

---

## 8. Optimisations

### 8.1 Connection Pooling & Redis Pub/Sub

```typescript
// apps/api/src/modules/collaboration/services/redis-pubsub.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private readonly publishers = new Map<string, any>();
  private readonly subscribers = new Map<string, any>();

  constructor() {}

  async onModuleInit() {
    // Créer les pub/sub clients
    this.createPubSub('project:*:user:*');
    this.createPubSub('project:*:cursor:*');
    this.createPubSub('project:*:node:*');
  }

  async onModuleDestroy() {
    // Fermer tous les pub/sub clients
    for (const [name, publisher] of this.publishers) {
      await publisher.quit();
      this.publishers.delete(name);
    }
    for (const [name, subscriber] of this.subscribers) {
      await subscriber.quit();
      this.subscribers.delete(name);
    }
  }

  private createPubSub(pattern: string) {
    // Publisher
    const publisher = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });
    this.publishers.set(pattern, publisher);

    // Subscriber
    const subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    subscriber.psubscribe(pattern, (err, count) => {
      if (err) {
        this.logger.error(`Redis subscribe error: ${err}`);
        return;
      }

      this.logger.log(`Subscribed to ${pattern}, ${count} channels`);
    });

    subscriber.on('message', (channel, message) => {
      this.logger.debug(`Received message from ${channel}: ${message}`);

      // Parser le pattern pour extraire projectId et eventType
      const [, projectId, eventType] = channel.split(':');

      // Broadcast le message via le Gateway
      this.broadcastToProject(projectId, eventType, JSON.parse(message));
    });

    this.subscribers.set(pattern, subscriber);
  }

  private broadcastToProject(projectId: string, eventType: string, message: any) {
    // Utiliser le Gateway pour broadcast aux clients connectés
    // (Ceci nécessite d'injecter le Gateway ou d'utiliser Socket.io Server global)
  }

  async publish(channel: string, message: any) {
    const publisher = this.publishers.get(channel);
    if (!publisher) {
      this.logger.warn(`No publisher found for channel: ${channel}`);
      return;
    }

    await publisher.publish(channel, JSON.stringify(message));
  }
}
```

### 8.2 Compression de Payloads

```typescript
// apps/api/src/modules/collaboration/utils/compression.util.ts
import { compress, decompress } from 'lz-string';
import { Logger } from '@nestjs/common';

export class CompressionUtil {
  private static readonly logger = new Logger(CompressionUtil.name);

  static compressPayload<T>(payload: T): string {
    try {
      return compress(JSON.stringify(payload));
    } catch (error) {
      this.logger.error('Compression error:', error);
      return JSON.stringify(payload);
    }
  }

  static decompressPayload<T>(compressed: string): T | null {
    try {
      return JSON.parse(decompress(compressed));
    } catch (error) {
      this.logger.error('Decompression error:', error);
      return null;
    }
  }

  static shouldCompress(size: number): boolean {
    // Compresser si le payload fait > 1KB
    return size > 1024;
  }

  static compressIfNeeded<T>(payload: T): { compressed: string; size: number } {
    const json = JSON.stringify(payload);
    const size = Buffer.byteLength(json, 'utf8');

    if (this.shouldCompress(size)) {
      return {
        compressed: this.compressPayload(payload),
        size: size,
      };
    }

    return {
      compressed: json,
      size: size,
    };
  }
}
```

### 8.3 Batching d'Événements

```typescript
// apps/api/src/modules/collaboration/services/event-batcher.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

interface EventBatch {
  projectId: string;
  events: any[];
  timestamp: number;
}

@Injectable()
export class EventBatcherService implements OnModuleDestroy {
  private readonly logger = new Logger(EventBatcherService.name);
  private readonly batchMap = new Map<string, EventBatch>();
  private readonly batchIntervalMs = 100; // 100ms de batching
  private readonly intervals = new Map<string, NodeJS.Timeout>();

  constructor(private readonly server: Server) {}

  addEvent(projectId: string, event: any) {
    if (!this.batchMap.has(projectId)) {
      this.batchMap.set(projectId, {
        projectId,
        events: [],
        timestamp: Date.now(),
      });

      // Démarrer l'intervalle de flush pour ce projet
      this.intervals.set(
        projectId,
        setInterval(() => this.flushProject(projectId), this.batchIntervalMs),
      );
    }

    const batch = this.batchMap.get(projectId);
    batch.events.push(event);

    // Flush immédiatement si trop d'événements
    if (batch.events.length >= 50) {
      this.flushProject(projectId);
    }
  }

  private flushProject(projectId: string) {
    const batch = this.batchMap.get(projectId);
    if (!batch || batch.events.length === 0) return;

    this.logger.debug(`Flushing ${batch.events.length} events for project ${projectId}`);

    // Batch broadcast
    this.server.to(`project:${projectId}`).emit('batch:events', {
      projectId,
      events: batch.events,
      timestamp: batch.timestamp,
      count: batch.events.length,
    });

    // Reset batch
    batch.events = [];
    batch.timestamp = Date.now();
  }

  onModuleDestroy() {
    // Flush tous les batches en cours
    for (const [projectId, interval] of this.intervals) {
      clearInterval(interval);
      this.flushProject(projectId);
    }
    this.intervals.clear();
  }
}
```

---

## 9. Sécurité WebSocket

### 9.1 Validation des Tokens

```typescript
// apps/api/src/modules/collaboration/guards/websocket-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const handshake = client.handshake;

    if (!handshake) {
      throw new UnauthorizedException('No handshake data');
    }

    // Extraire le token depuis auth
    const token = handshake.auth?.token as string;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Attacher l'utilisateur au socket
      client.data.user = payload;
      client.data.userId = payload.sub;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### 9.2 Rate Limiting par Utilisateur

```typescript
// apps/api/src/modules/collaboration/guards/websocket-rate-limit.guard.ts
import { CanActivate, ExecutionContext, Injectable, ThrottlerException } from '@nestjs/throttler';
import { WebSocketGateway } from '@nestjs/websockets';

@Injectable()
@WebSocketGateway()
export class WebSocketRateLimitGuard implements CanActivate {
  private readonly rateLimits = new Map<string, { count: number; resetTime: number }>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const userId = client.data.userId;

    if (!userId) {
      return true; // Pas encore authentifié
    }

    const now = Date.now();
    const limit = this.rateLimits.get(userId);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(userId, {
        count: 0,
        resetTime: now + 60000, // Reset chaque minute
      });
      return true;
    }

    // Limiter à 100 événements par minute
    if (limit.count >= 100) {
      throw new ThrottlerException('Too many WebSocket events');
    }

    limit.count++;

    return true;
  }
}
```

### 9.3 Sanitization des Payloads

```typescript
// apps/api/src/modules/collaboration/pipes/websocket-sanitization.pipe.ts
import { PipeTransform, Injectable, PipeArgumentMetadata } from '@nestjs/common';
import { z } from 'zod';

const cursorMoveSchema = z.object({
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000),
  nodeId: z.string().optional(),
});

const createNodeSchema = z.object({
  prompt: z.string().min(1).max(2000),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  parentIds: z.array(z.string()).max(10).optional(),
});

@Injectable()
export class WebSocketSanitizationPipe implements PipeTransform {
  transform(value: any, metadata: PipeArgumentMetadata) {
    const { metatype } = metadata;

    // Sanitiser selon le type d'événement
    switch (metadata.metatype) {
      case 'cursor:move':
        return cursorMoveSchema.parse(value);
      case 'node:create':
        return createNodeSchema.parse(value);
      case 'node:update':
        return z.object({
          nodeId: z.string(),
          updates: z.record(z.string(), z.any()),
        }).parse(value);
      case 'node:delete':
        return z.object({
          nodeId: z.string(),
        }).parse(value);
      default:
        return value;
    }
  }
}
```

---

## 10. Frontend Integration

### 10.1 Installation Socket.io Client

```bash
cd apps/web
pnpm add socket.io-client
```

### 10.2 Création du Hook WebSocket

```typescript
// apps/web/src/features/collaboration/hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { UserPresence } from '@nonlinear/shared/types';
import { toast } from '@nonlinear/ui/organisms/ToastContainer';
import { useToast } from '@nonlinear/ui/organisms';

export interface UseWebSocketOptions {
  projectId?: string;
  token?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  users: UserPresence[];
  myUserId?: string;
}

export function useWebSocket(options: UseWebSocketOptions): WebSocketState {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [myUserId, setMyUserId] = useState<string>();
  const { success } = useToast();

  // Connection
  useEffect(() => {
    if (!options.projectId || !options.token) return;

    setIsConnecting(true);

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      path: '/socket.io/',
      query: {
        projectId: options.projectId,
      },
      auth: {
        token: options.token,
      },
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection successful
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      options.onConnect?.();
    });

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);

      // Fallback : utiliser HTTP polling
      options.onError?.(new Error('WebSocket connection failed, using HTTP polling'));
    });

    // User joined
    socket.on('user:joined', (data) => {
      console.log('User joined:', data);
      setUsers((prev) => [...prev, data]);
    });

    // User left
    socket.on('user:left', (data) => {
      console.log('User left:', data);
      setUsers((prev) => prev.filter(u => u.userId !== data.userId));
    });

    // Current users
    socket.on('users:current', (data) => {
      console.log('Current users:', data);
      setUsers(data.users);
    });

    // Cursor moved
    socket.on('cursor:moved', (data) => {
      // Mettre à jour l'état du curseur de l'utilisateur
      setUsers((prev) =>
        prev.map((user) =>
          user.userId === data.userId
            ? { ...user, cursor: data.cursor, lastSeen: new Date() }
            : user
        ),
      );
    });

    // Node events
    socket.on('node:created', (data) => {
      console.log('Node created:', data);
      success('Nœud créé', 'Nouveau nœud ajouté par un collaborateur');
    });

    socket.on('node:updated', (data) => {
      console.log('Node updated:', data);
    });

    socket.on('node:deleted', (data) => {
      console.log('Node deleted:', data);
    });

    socket.on('node:streaming', (data) => {
      console.log('Node streaming:', data);
    });

    // Error
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast({
        type: 'error',
        message: error.message || 'Erreur de connexion',
      });
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socket.off('connect');
      socket.off('connect_error');
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('users:current');
      socket.off('cursor:moved');
      socket.off('node:created');
      socket.off('node:updated');
      socket.off('node:deleted');
      socket.off('node:streaming');
      socket.off('error');
    };
  }, [options.projectId, options.token]);

  // Reconnexion automatique
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Se reconnecter si visible
        if (!isConnected && !isConnecting && socketRef.current) {
          socketRef.current.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, isConnecting]);

  // Récupérer l'ID utilisateur depuis le token
  useEffect(() => {
    if (options.token) {
      try {
        const payload = JSON.parse(atob(options.token.split('.')[1]));
        setMyUserId(payload.sub);
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }, [options.token]);

  // Emit functions
  const emitCursorMove = useCallback((x: number, y: number, nodeId?: string) => {
    if (!isConnected || !socketRef.current) return;

    socketRef.current.emit('cursor:move', { x, y, nodeId });
  }, [isConnected]);

  const emitCreateNode = useCallback((prompt: string, position: { x: number; y: number }) => {
    if (!isConnected || !socketRef.current) return;

    socketRef.current.emit('node:create', { prompt, position });
  }, [isConnected]);

  const emitUpdateNode = useCallback((nodeId: string, updates: any) => {
    if (!isConnected || !socketRef.current) return;

    socketRef.current.emit('node:update', { nodeId, updates });
  }, [isConnected]);

  const emitDeleteNode = useCallback((nodeId: string) => {
    if (!isConnected || !socketRef.current) return;

    socketRef.current.emit('node:delete', { nodeId });
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    users,
    myUserId,
    emitCursorMove,
    emitCreateNode,
    emitUpdateNode,
    emitDeleteNode,
  };
}
```

### 10.3 Composant de Canvas Collaboratif

```typescript
// apps/web/src/features/collaboration/components/CollaborativeCanvas.tsx
'use client';

import { useMemo, useRef } from 'react';
import { ReactFlow, useReactFlow } from '@xyflow/react';
import { Node, Edge } from '@nonlinear/shared/types';
import { useWebSocket } from '../hooks/useWebSocket';

interface CollaborativeCanvasProps {
  projectId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

export function CollaborativeCanvas({
  projectId,
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
}: CollaborativeCanvasProps) {
  const token = localStorage.getItem('access_token');
  const { isConnected, users, emitCursorMove, emitCreateNode } = useWebSocket({
    projectId,
    token,
    onConnect: () => console.log('WebSocket connected'),
    onDisconnect: () => console.log('WebSocket disconnected'),
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useReactFlow();

  // Rendre les curseurs distants
  const remoteCursors = useMemo(() => {
    return users
      .filter((user) => user.cursor && user.userId !== currentUserId)
      .map((user) => ({
        userId: user.userId,
        username: user.username,
        x: user.cursor?.x || 0,
        y: user.cursor?.y || 0,
        nodeId: user.cursor?.nodeId,
      }));
  }, [users]);

  const onNodeDrag = useCallback(
    (event: any, node: Node) => {
      // Émettre les changements de position
      // (Pour la synchronisation multi-user)
    },
    [],
  );

  const onNodeDragStop = useCallback(
    (event: any, node: Node) => {
      // Émettre la nouvelle position via WebSocket
      // (Ou utiliser Server Actions + WebSocket events)
    },
    [],
  );

  // Écouter les événements WebSocket pour mettre à jour les nœuds
  useEffect(() => {
    const socket = socketRef.current;

    const handleNodeCreated = (data) => {
      // Ajouter le nœud créé par un autre utilisateur
      setNodes((prev) => [...prev, data.node]);
    };

    const handleNodeUpdated = (data) => {
      // Mettre à jour le nœud modifié
      setNodes((prev) =>
        prev.map((n) => (n.id === data.nodeId ? { ...n, ...data.updates } : n)),
      );
    };

    const handleNodeDeleted = (data) => {
      // Supprimer le nœud
      setNodes((prev) => prev.filter((n) => n.id !== data.nodeId)));
    };

    socket.on('node:created', handleNodeCreated);
    socket.on('node:updated', handleNodeUpdated);
    socket.on('node:deleted', handleNodeDeleted);

    return () => {
      socket.off('node:created', handleNodeCreated);
      socket.off('node:updated', handleNodeUpdated);
      socket.off('node:deleted', handleNodeDeleted);
    };
  }, []);

  return (
    <>
      <div className="relative w-full h-full">
        {/* Curseurs distants */}
        {remoteCursors.map((cursor) => (
          <RemoteCursor
            key={cursor.userId}
            x={cursor.x}
            y={cursor.y}
            username={cursor.username}
          />
        ))}

        {/* Canvas React Flow */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          fitView
          snapToGrid
          className="w-full h-full"
        >
          {/* Custom Node Component */}
          <NodeTypes />
        </ReactFlow>
      </div>
    </>
  );
}

// Composant Remote Cursor
function RemoteCursor({ x, y, username }: any) {
  return (
    <div
      className="fixed pointer-events-none z-50 transition-transform duration-100 ease-linear"
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <div className="flex items-center gap-2 bg-blue-500 text-white px-2 py-1 rounded shadow-lg">
        {username.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}
```

---

## 📚 Documentation Connexe

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Architecture backend complète
- [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md) - Documentation API
- [BACKEND_DATABASE_SCHEMA.md](./BACKEND_DATABASE_SCHEMA.md) - Schéma database
- [BACKEND_TESTING_GUIDE.md](./BACKEND_TESTING_GUIDE.md) - Guide de testing
- [FRONTEND_ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) - Architecture frontend

---

**Guide de collaboration WebSocket créé pour le projet NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
