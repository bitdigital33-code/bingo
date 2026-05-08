import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsQueueService } from './infrastructure/analytics-queue.service';
import { BingoStoreService } from './infrastructure/bingo-store.service';
import { DemoStoreService } from './infrastructure/demo-store.service';
import { PrismaBingoStoreService } from './infrastructure/prisma-bingo-store.service';
import { PrismaService } from './infrastructure/prisma.service';
import { RedisBridgeService } from './infrastructure/redis-bridge.service';
import { BingoCardFactory } from './domain/bingo-card.factory';
import { BingoEngineService } from './domain/bingo-engine.service';
import { BingoFacadeService } from './application/bingo-facade.service';
import { AdminController } from './presentation/admin.controller';
import { AuthController } from './presentation/auth.controller';
import { ClaimController } from './presentation/claim.controller';
import { HealthController } from './presentation/health.controller';
import { PublicController } from './presentation/public.controller';
import { RealtimeGateway } from './presentation/realtime.gateway';
import { AdminAuthGuard } from './presentation/admin-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'bingo-secret',
      signOptions: {
        expiresIn: '12h',
      },
    }),
  ],
  controllers: [
    AdminController,
    AuthController,
    ClaimController,
    HealthController,
    PublicController,
  ],
  providers: [
    AdminAuthGuard,
    AnalyticsQueueService,
    BingoStoreService,
    BingoCardFactory,
    BingoEngineService,
    BingoFacadeService,
    DemoStoreService,
    PrismaBingoStoreService,
    PrismaService,
    RedisBridgeService,
    RealtimeGateway,
  ],
})
export class BingoModule {}
