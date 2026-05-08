import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class AnalyticsQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsQueueService.name);
  private queue?: Queue;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return;
    }

    try {
      this.queue = new Queue('room-analytics', {
        connection: {
          url: redisUrl,
        },
      });
    } catch (error) {
      this.logger.warn(`BullMQ indisponivel em modo local: ${String(error)}`);
    }
  }

  async enqueueRoomAnalytics(roomId: string, reason: string) {
    if (!this.queue) {
      return;
    }

    await this.queue.add('room-analytics', {
      roomId,
      reason,
      createdAt: new Date().toISOString(),
    });
  }

  async onModuleDestroy() {
    if (!this.queue) {
      return;
    }

    await this.queue.close();
    this.queue = undefined;
  }
}
