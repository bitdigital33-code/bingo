import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compareSync } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthResponseDto,
  CreateRoomRequest,
  CreateTenantRequest,
  DrawEntryCommand,
  JoinRoomRequest,
  LoginRequest,
  MatchCommandResponse,
  RoomSnapshot,
} from '@bingo/contracts';
import { buildDrawDisplay } from '../domain/bingo-rules';
import { BingoEngineService } from '../domain/bingo-engine.service';
import type { InvitePayload, StoredRoom, StoredUser } from '../domain/internal-types';
import { AnalyticsQueueService } from '../infrastructure/analytics-queue.service';
import { BingoStoreService } from '../infrastructure/bingo-store.service';
import { RedisBridgeService } from '../infrastructure/redis-bridge.service';
import { RealtimeGateway } from '../presentation/realtime.gateway';

@Injectable()
export class BingoFacadeService {
  private readonly webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:5173';

  constructor(
    private readonly analyticsQueue: AnalyticsQueueService,
    private readonly engine: BingoEngineService,
    private readonly jwtService: JwtService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly redisBridge: RedisBridgeService,
    private readonly store: BingoStoreService,
  ) {}

  async getBootstrap(user: StoredUser) {
    const rooms = await Promise.all(
      (await this.store.getRoomsForTenant(user.tenantId)).map((room) => this.snapshotRoom(room)),
    );

    return {
      demoCredentials: {
        email: 'admin@bingo.local',
        password: 'bingo123',
      },
      persistenceMode: await this.store.getMode(),
      rooms,
    };
  }

  async createTenant(payload: CreateTenantRequest): Promise<AuthResponseDto> {
    const existing = await this.store.getUserByEmail(payload.ownerEmail);
    if (existing) {
      throw new BadRequestException('Ja existe uma conta com este email.');
    }

    const created = await this.store.createTenant(payload);
    return this.buildAuthResponse(created.owner.id);
  }

  async login(payload: LoginRequest): Promise<AuthResponseDto> {
    const user = await this.store.getUserByEmail(payload.email);

    if (!user || !compareSync(payload.password, user.passwordHash)) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    return this.buildAuthResponse(user.id);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_SECRET ?? 'bingo-secret',
      });
      return this.buildAuthResponse(payload.sub);
    } catch {
      throw new UnauthorizedException('Refresh token invalido.');
    }
  }

  async inviteMember(user: StoredUser, payload: InvitePayload) {
    const existing = await this.store.getUserByEmail(payload.email);
    if (existing) {
      throw new BadRequestException('Email ja cadastrado.');
    }

    const member = await this.store.inviteMember(user.tenantId, payload);
    return {
      id: member.id,
      email: member.email,
      role: member.role,
      passwordHint: payload.password ?? 'bingo123',
    };
  }

  async listRooms(user: StoredUser) {
    return Promise.all(
      (await this.store.getRoomsForTenant(user.tenantId)).map((room) => this.snapshotRoom(room)),
    );
  }

  async createRoom(user: StoredUser, payload: CreateRoomRequest): Promise<MatchCommandResponse> {
    const room = await this.store.createRoom(user.tenantId, payload);
    return {
      room: await this.snapshotRoom(room),
    };
  }

  async updateRoom(user: StoredUser, roomId: string, payload: Partial<CreateRoomRequest>) {
    const room = await this.getTenantRoom(user, roomId);
    const updatedRoom = await this.store.updateRoom(room.id, payload);

    if (!updatedRoom) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    return {
      room: await this.snapshotRoom(updatedRoom),
    };
  }

  async startMatch(user: StoredUser, roomId: string) {
    const room = await this.getTenantRoom(user, roomId);
    await this.store.updateMatchStatus(room.matchId, 'live');
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async pauseMatch(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    await this.store.updateMatchStatus(matchId, 'paused');
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async resumeMatch(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    await this.store.updateMatchStatus(matchId, 'live');
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async endMatch(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    await this.store.updateMatchStatus(matchId, 'completed');
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async addDraw(user: StoredUser, matchId: string, payload: DrawEntryCommand) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const match = await this.store.getMatch(matchId);

    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }
    if (match.status !== 'live') {
      throw new BadRequestException('A partida precisa estar ao vivo para registrar sorteios.');
    }

    this.engine.assertValidDraw(payload.letter, payload.value);
    const activeDraws = this.engine.replayActiveDraws(match.drawEvents);
    const display = buildDrawDisplay(payload.letter, payload.value);
    if (this.engine.hasDuplicateActiveDraw(activeDraws, display)) {
      throw new BadRequestException('Numero ja sorteado nesta partida.');
    }

    await this.store.appendDraw(matchId, {
      ...payload,
      actorUserId: user.id,
    });

    return this.broadcastRoom(room, 'draw.created');
  }

  async correctDraw(
    user: StoredUser,
    matchId: string,
    drawId: string,
    payload: DrawEntryCommand,
  ) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    this.engine.assertValidDraw(payload.letter, payload.value);
    const activeDraws = this.engine.replayActiveDraws(match.drawEvents);
    const target = activeDraws.find((draw) => draw.id === drawId);
    if (!target) {
      throw new NotFoundException('Sorteio alvo nao encontrado.');
    }

    const display = buildDrawDisplay(payload.letter, payload.value);
    if (this.engine.hasDuplicateActiveDraw(activeDraws, display, drawId)) {
      throw new BadRequestException('O numero corrigido entraria duplicado no historico.');
    }

    await this.store.appendDraw(matchId, {
      ...payload,
      actorUserId: user.id,
      type: 'correction',
      correctedFromId: drawId,
    });

    return this.broadcastRoom(room, 'draw.corrected');
  }

  async revertDraw(user: StoredUser, matchId: string, drawId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    const activeDraws = this.engine.replayActiveDraws(match.drawEvents);
    const target = activeDraws.find((draw) => draw.id === drawId);
    if (!target) {
      throw new NotFoundException('Sorteio alvo nao encontrado.');
    }

    await this.store.appendDraw(matchId, {
      letter: target.letter,
      value: target.value,
      actorUserId: user.id,
      type: 'revert',
      correctedFromId: drawId,
    });

    return this.broadcastRoom(room, 'draw.corrected');
  }

  async replayLast(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const snapshot = await this.snapshotRoom(room);
    return {
      room: snapshot,
      replay: snapshot.match.currentDraw,
    };
  }

  async claim(matchId: string, playerToken?: string) {
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    const room = await this.store.getRoom(match.roomId);
    if (!room) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    const snapshot = await this.snapshotRoom(room);
    const claimant = playerToken ? await this.store.getPlayerByToken(playerToken) : undefined;
    return {
      room: snapshot,
      claimant: claimant
        ? {
            id: claimant.id,
            name: claimant.name,
          }
        : undefined,
      winner: snapshot.match.lastWinner,
    };
  }

  async joinRoom(joinCode: string, payload: JoinRoomRequest) {
    const room = await this.store.getRoomByCode(joinCode);
    if (!room) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    const cardsRequested = Math.min(
      Math.max(payload.cardsRequested ?? 1, 1),
      room.maxCardsPerPlayer,
    );

    const player = await this.store.createPlayerSession({
      roomId: room.id,
      name: payload.name,
      avatar: payload.avatar,
      cardsRequested,
    });

    const snapshot = await this.snapshotRoom(room);
    await this.realtimeGateway.emitRoom(room.joinCode, 'player.presence.updated', snapshot);

    return {
      playerToken: player.token,
      player: snapshot.match.players.find((entry) => entry.id === player.id)!,
      room: snapshot,
    };
  }

  async getPublicState(joinCode: string) {
    const room = await this.store.getRoomByCode(joinCode);
    if (!room) {
      throw new NotFoundException('Sala nao encontrada.');
    }
    return this.snapshotRoom(room);
  }

  async getTvState(joinCode: string) {
    return this.getPublicState(joinCode);
  }

  private async buildAuthResponse(userId: string): Promise<AuthResponseDto> {
    const user = await this.store.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado.');
    }
    const tenant = await this.store.getTenant(user.tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Tenant nao encontrado.');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant,
    };
  }

  private async getTenantRoom(user: StoredUser, roomId: string) {
    const room = await this.store.getRoom(roomId);

    if (!room || room.tenantId !== user.tenantId) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    return room;
  }

  private async getTenantRoomByMatch(user: StoredUser, matchId: string) {
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    return this.getTenantRoom(user, match.roomId);
  }

  private async snapshotRoom(room: StoredRoom): Promise<RoomSnapshot> {
    const [tenant, match, players] = await Promise.all([
      this.store.getTenant(room.tenantId),
      this.store.getMatch(room.matchId),
      this.store.getPlayersForRoom(room.id),
    ]);

    if (!tenant || !match) {
      throw new NotFoundException('Projecao da sala indisponivel.');
    }

    return this.engine.buildRoomSnapshot({
      room,
      match,
      tenant,
      players,
      webBaseUrl: this.webBaseUrl,
    });
  }

  private async broadcastRoom(room: StoredRoom, event: string) {
    const snapshot = await this.snapshotRoom(room);
    await this.realtimeGateway.emitRoom(room.joinCode, event, snapshot);
    await this.realtimeGateway.emitRoom(room.joinCode, 'room.snapshot', snapshot);
    await this.redisBridge.publish(`room:${room.joinCode}`, {
      event,
      room: snapshot,
    });
    await this.analyticsQueue.enqueueRoomAnalytics(room.id, event);

    if (snapshot.match.lastWinner?.triggeredByDrawId === snapshot.match.currentDraw?.id) {
      await this.realtimeGateway.emitRoom(
        room.joinCode,
        'winner.detected',
        snapshot.match.lastWinner,
      );
      await this.realtimeGateway.emitRoom(
        room.joinCode,
        'winner.confirmed',
        snapshot.match.lastWinner,
      );
    }

    return {
      room: snapshot,
    };
  }
}
