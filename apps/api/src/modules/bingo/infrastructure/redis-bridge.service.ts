import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisBridgeService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisBridgeService.name);
  private client?: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      void this.client.connect();
    } catch (error) {
      this.logger.warn(`Redis opcional indisponivel: ${String(error)}`);
    }
  }

  async publish(channel: string, payload: unknown) {
    if (!this.client) {
      return;
    }

    await this.client.publish(channel, JSON.stringify(payload));
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }

    await this.client.quit();
    this.client = undefined;
  }
}
