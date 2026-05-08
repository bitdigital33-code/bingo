import { Injectable, Logger } from '@nestjs/common';
import type { CreateRoomRequest, CreateTenantRequest, DrawEntryCommand, MatchStatus } from '@bingo/contracts';
import type {
  InvitePayload,
  StoredDrawEvent,
  StoredMatch,
  StoredPlayerSession,
  StoredRoom,
  StoredTenant,
  StoredUser,
} from '../domain/internal-types';
import { DemoStoreService } from './demo-store.service';
import { PrismaBingoStoreService } from './prisma-bingo-store.service';

type PersistenceStore = {
  getUserByEmail(email: string): StoredUser | Promise<StoredUser | undefined> | undefined;
  getUserById(userId: string): StoredUser | Promise<StoredUser | undefined> | undefined;
  getTenant(tenantId: string): StoredTenant | Promise<StoredTenant | undefined> | undefined;
  getRoom(roomId: string): StoredRoom | Promise<StoredRoom | undefined> | undefined;
  getRoomByCode(joinCode: string): StoredRoom | Promise<StoredRoom | undefined> | undefined;
  getRoomsForTenant(tenantId: string): StoredRoom[] | Promise<StoredRoom[]>;
  getMatch(matchId: string): StoredMatch | Promise<StoredMatch | undefined> | undefined;
  getPlayersForRoom(roomId: string): StoredPlayerSession[] | Promise<StoredPlayerSession[]>;
  getPlayerByToken(token: string): StoredPlayerSession | Promise<StoredPlayerSession | undefined> | undefined;
  createTenant(payload: CreateTenantRequest): Promise<{
    tenant: StoredTenant;
    owner: StoredUser;
    room: StoredRoom;
  }> | {
    tenant: StoredTenant;
    owner: StoredUser;
    room: StoredRoom;
  };
  inviteMember(tenantId: string, payload: InvitePayload): StoredUser | Promise<StoredUser>;
  createRoom(tenantId: string, payload: CreateRoomRequest): StoredRoom | Promise<StoredRoom>;
  updateRoom(
    roomId: string,
    patch: Partial<CreateRoomRequest>,
  ): StoredRoom | Promise<StoredRoom | undefined> | undefined;
  updateMatchStatus(
    matchId: string,
    status: MatchStatus,
  ): StoredMatch | Promise<StoredMatch | undefined> | undefined;
  appendDraw(
    matchId: string,
    payload: DrawEntryCommand & {
      actorUserId?: string;
      type?: StoredDrawEvent['type'];
      correctedFromId?: string;
    },
  ): StoredDrawEvent | Promise<StoredDrawEvent | undefined> | undefined;
  createPlayerSession(params: {
    roomId: string;
    name: string;
    avatar?: string;
    cardsRequested: number;
  }): StoredPlayerSession | Promise<StoredPlayerSession>;
};

@Injectable()
export class BingoStoreService {
  private readonly logger = new Logger(BingoStoreService.name);
  private resolvedMode?: 'demo' | 'prisma';

  constructor(
    private readonly demoStore: DemoStoreService,
    private readonly prismaStore: PrismaBingoStoreService,
  ) {}

  async getMode() {
    await this.resolveMode();
    return this.resolvedMode!;
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    return this.useStore<StoredUser | undefined>((store) => store.getUserByEmail(email));
  }

  async getUserById(userId: string): Promise<StoredUser | undefined> {
    return this.useStore<StoredUser | undefined>((store) => store.getUserById(userId));
  }

  async getTenant(tenantId: string): Promise<StoredTenant | undefined> {
    return this.useStore<StoredTenant | undefined>((store) => store.getTenant(tenantId));
  }

  async getRoom(roomId: string): Promise<StoredRoom | undefined> {
    return this.useStore<StoredRoom | undefined>((store) => store.getRoom(roomId));
  }

  async getRoomByCode(joinCode: string): Promise<StoredRoom | undefined> {
    return this.useStore<StoredRoom | undefined>((store) => store.getRoomByCode(joinCode));
  }

  async getRoomsForTenant(tenantId: string): Promise<StoredRoom[]> {
    return this.useStore<StoredRoom[]>((store) => store.getRoomsForTenant(tenantId));
  }

  async getMatch(matchId: string): Promise<StoredMatch | undefined> {
    return this.useStore<StoredMatch | undefined>((store) => store.getMatch(matchId));
  }

  async getPlayersForRoom(roomId: string): Promise<StoredPlayerSession[]> {
    return this.useStore<StoredPlayerSession[]>((store) => store.getPlayersForRoom(roomId));
  }

  async getPlayerByToken(token: string): Promise<StoredPlayerSession | undefined> {
    return this.useStore<StoredPlayerSession | undefined>((store) => store.getPlayerByToken(token));
  }

  async createTenant(payload: CreateTenantRequest) {
    return this.useStore<{
      tenant: StoredTenant;
      owner: StoredUser;
      room: StoredRoom;
    }>((store) => store.createTenant(payload));
  }

  async inviteMember(tenantId: string, payload: InvitePayload): Promise<StoredUser> {
    return this.useStore<StoredUser>((store) => store.inviteMember(tenantId, payload));
  }

  async createRoom(tenantId: string, payload: CreateRoomRequest): Promise<StoredRoom> {
    return this.useStore<StoredRoom>((store) => store.createRoom(tenantId, payload));
  }

  async updateRoom(roomId: string, patch: Partial<CreateRoomRequest>): Promise<StoredRoom | undefined> {
    return this.useStore<StoredRoom | undefined>((store) => store.updateRoom(roomId, patch));
  }

  async updateMatchStatus(matchId: string, status: MatchStatus): Promise<StoredMatch | undefined> {
    return this.useStore<StoredMatch | undefined>((store) =>
      store.updateMatchStatus(matchId, status),
    );
  }

  async appendDraw(
    matchId: string,
    payload: DrawEntryCommand & {
      actorUserId?: string;
      type?: StoredDrawEvent['type'];
      correctedFromId?: string;
    },
  ) {
    return this.useStore<StoredDrawEvent | undefined>((store) => store.appendDraw(matchId, payload));
  }

  async createPlayerSession(params: {
    roomId: string;
    name: string;
    avatar?: string;
    cardsRequested: number;
  }) {
    return this.useStore<StoredPlayerSession>((store) => store.createPlayerSession(params));
  }

  private async useStore<T>(callback: (store: PersistenceStore) => T | Promise<T>) {
    const store = await this.resolveStore();
    return callback(store);
  }

  private async resolveStore(): Promise<PersistenceStore> {
    const mode = await this.resolveMode();
    return mode === 'prisma' ? this.prismaStore : this.demoStore;
  }

  private async resolveMode() {
    if (this.resolvedMode) {
      return this.resolvedMode;
    }

    const configured = (process.env.BINGO_PERSISTENCE ?? 'auto').toLowerCase();

    if (configured === 'demo') {
      this.resolvedMode = 'demo';
      return this.resolvedMode;
    }

    const prismaAvailable = await this.prismaStore.isAvailable();

    if (prismaAvailable) {
      this.resolvedMode = 'prisma';
      this.logger.log('Persistencia Prisma ativa.');
      return this.resolvedMode;
    }

    if (configured === 'prisma') {
      throw new Error(
        'BINGO_PERSISTENCE=prisma foi configurado, mas a conexao com o banco nao ficou disponivel.',
      );
    }

    this.resolvedMode = 'demo';
    this.logger.warn('Persistencia real indisponivel. Mantendo modo demo em memoria.');
    return this.resolvedMode;
  }
}
