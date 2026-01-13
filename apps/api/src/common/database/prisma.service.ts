import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly MAX_RETRIES = 10;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  private async connectWithRetry(retries = 0): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (retries < this.MAX_RETRIES) {
        this.logger.warn(
          `Failed to connect to database (attempt ${retries + 1}/${this.MAX_RETRIES}): ${errorMessage}. Retrying in ${this.RETRY_DELAY}ms...`,
        );
        await this.sleep(this.RETRY_DELAY);
        return this.connectWithRetry(retries + 1);
      }

      this.logger.error(
        `Failed to connect to database after ${this.MAX_RETRIES} attempts: ${errorMessage}`,
      );
      this.logger.error(
        'Please ensure:\n' +
          '  1. PostgreSQL is running (check with: docker-compose up -d postgres)\n' +
          '  2. DATABASE_URL environment variable is set correctly\n' +
          '  3. Database server is accessible at the configured host/port',
      );
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
