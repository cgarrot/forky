import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import type { Server } from 'socket.io';

export type CollaborationServerEvent =
  | 'user:joined'
  | 'user:left'
  | 'users:current'
  | 'cursor:moved'
  | 'node:created'
  | 'node:updated'
  | 'node:deleted'
  | 'node:streaming'
  | 'pong'
  | 'error'
  | 'cursor-update'
  | 'node-updated'
  | 'user-joined'
  | 'user-left';

type PubSubEnvelope = {
  room: string;
  event: CollaborationServerEvent;
  payload: Record<string, unknown>;
  excludeSocketId?: string;
};

const CHANNEL = 'collaboration_events';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
};

const isEnvelope = (value: unknown): value is PubSubEnvelope => {
  if (!isRecord(value)) return false;
  if (typeof value.room !== 'string') return false;
  if (typeof value.event !== 'string') return false;
  if (!isRecord(value.payload)) return false;
  if (
    value.excludeSocketId !== undefined &&
    typeof value.excludeSocketId !== 'string'
  ) {
    return false;
  }

  return (
    value.event === 'user:joined' ||
    value.event === 'user:left' ||
    value.event === 'users:current' ||
    value.event === 'cursor:moved' ||
    value.event === 'node:created' ||
    value.event === 'node:updated' ||
    value.event === 'node:deleted' ||
    value.event === 'node:streaming' ||
    value.event === 'pong' ||
    value.event === 'error' ||
    value.event === 'cursor-update' ||
    value.event === 'node-updated' ||
    value.event === 'user-joined' ||
    value.event === 'user-left'
  );
};

@Injectable()
export class CollaborationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollaborationService.name);
  private server?: Server;

  private publisher?: Redis;
  private subscriber?: Redis;
  private subscribed = false;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    const connections = [this.publisher, this.subscriber].filter(
      (connection): connection is Redis => connection !== undefined,
    );

    await Promise.all(
      connections.map(async (connection) => {
        try {
          await connection.quit();
        } catch {
          connection.disconnect();
        }
      }),
    );
  }

  bindServer(server: Server) {
    this.server = server;
    this.ensureSubscription();
  }

  emitToRoom(envelope: PubSubEnvelope) {
    if (!this.publisher) {
      this.emitLocal(envelope);
      return;
    }

    this.publisher
      .publish(CHANNEL, JSON.stringify(envelope))
      .catch((error: unknown) => {
        const message =
          isRecord(error) && typeof error.message === 'string'
            ? error.message
            : 'unknown';
        this.logger.error(`Redis publish failed: ${message}`);
      });
  }

  emitToProject(
    projectId: string,
    event: CollaborationServerEvent,
    payload: Record<string, unknown>,
    excludeSocketId?: string,
  ) {
    const room = `project:${projectId}`;
    this.emitToRoom({ room, event, payload, excludeSocketId });
  }

  private ensureSubscription() {
    if (!this.subscriber || this.subscribed) return;

    this.subscribed = true;

    this.subscriber.subscribe(CHANNEL).catch((error: unknown) => {
      const message =
        isRecord(error) && typeof error.message === 'string'
          ? error.message
          : 'unknown';
      this.logger.error(`Redis subscribe failed: ${message}`);
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel !== CHANNEL) return;

      const parsed = parseJson(message);
      if (!isEnvelope(parsed)) return;

      this.emitLocal(parsed);
    });
  }

  private emitLocal(envelope: PubSubEnvelope) {
    if (!this.server) return;

    const target = this.server.to(envelope.room);

    if (envelope.excludeSocketId) {
      target
        .except(envelope.excludeSocketId)
        .emit(envelope.event, envelope.payload);
      return;
    }

    target.emit(envelope.event, envelope.payload);
  }
}
