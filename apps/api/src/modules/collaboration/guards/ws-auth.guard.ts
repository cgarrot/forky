import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn('Missing websocket auth token');
      throw new WsException('Unauthorized');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(token);
      client.data.user = payload;
      return true;
    } catch (error: unknown) {
      const message =
        isRecord(error) && typeof error.message === 'string'
          ? error.message
          : 'token verification failed';

      this.logger.warn(`Websocket auth failed: ${message}`);
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = isRecord(client.handshake.auth)
      ? client.handshake.auth.token
      : undefined;

    const headerAuth = isRecord(client.handshake.headers)
      ? client.handshake.headers.authorization
      : undefined;

    const raw =
      typeof authToken === 'string'
        ? authToken
        : typeof headerAuth === 'string'
          ? headerAuth
          : undefined;

    if (!raw) return undefined;

    if (raw.startsWith('Bearer ')) {
      const [, token] = raw.split(' ');
      return token;
    }

    return raw;
  }
}
