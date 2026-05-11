import { Injectable, Logger } from '@nestjs/common';
import type {
  CreateRoomRequest,
  CreateTenantRequest,
  DrawEntryCommand,
  MatchStatus,
  StageMomentRequest,
  PrizeShowcaseRequest,
  TvRecentDrawsRequest,
  UpdatePrizeRoundsRequest,
  UpdatePlayerRequest,
} from '@bingo/contracts';
import type {
  AppendAuditLogParams,
  CreateWinClaimParams,
  InvitePayload,
  StoredAdminHistory,
  StoredAuditLog,
  StoredCard,
  StoredDrawEvent,
  StoredMatch,
  StoredPlayerSession,
  StoredPrintedCard,
  StoredRoom,
  StoredTenant,
  StoredUser,
  StoredWinClaim,
} from '../domain/internal-types';
import { PrismaBingoStoreService } from './prisma-bingo-store.service';

@Injectable()
export class BingoStoreService {
  private readonly logger = new Logger(BingoStoreService.name);
  private prismaReady = false;

  constructor(private readonly prismaStore: PrismaBingoStoreService) {}

  async getMode() {
    await this.ensurePrismaReady();
    return 'prisma' as const;
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    return this.useStore((store) => store.getUserByEmail(email));
  }

  async getUserById(userId: string): Promise<StoredUser | undefined> {
    return this.useStore((store) => store.getUserById(userId));
  }

  async getTenant(tenantId: string): Promise<StoredTenant | undefined> {
    return this.useStore((store) => store.getTenant(tenantId));
  }

  async getRoom(roomId: string): Promise<StoredRoom | undefined> {
    return this.useStore((store) => store.getRoom(roomId));
  }

  async getRoomByCode(joinCode: string): Promise<StoredRoom | undefined> {
    return this.useStore((store) => store.getRoomByCode(joinCode));
  }

  async getRoomsForTenant(tenantId: string): Promise<StoredRoom[]> {
    return this.useStore((store) => store.getRoomsForTenant(tenantId));
  }

  async getMatch(matchId: string): Promise<StoredMatch | undefined> {
    return this.useStore((store) => store.getMatch(matchId));
  }

  async getPlayersForRoom(roomId: string): Promise<StoredPlayerSession[]> {
    return this.useStore((store) => store.getPlayersForRoom(roomId));
  }

  async getPlayerById(
    playerSessionId: string,
  ): Promise<StoredPlayerSession | undefined> {
    return this.useStore((store) => store.getPlayerById(playerSessionId));
  }

  async getPlayerByToken(
    token: string,
  ): Promise<StoredPlayerSession | undefined> {
    return this.useStore((store) => store.getPlayerByToken(token));
  }

  async createTenant(payload: CreateTenantRequest) {
    return this.useStore((store) => store.createTenant(payload));
  }

  async inviteMember(
    tenantId: string,
    payload: InvitePayload,
  ): Promise<StoredUser> {
    return this.useStore((store) => store.inviteMember(tenantId, payload));
  }

  async createRoom(
    tenantId: string,
    payload: CreateRoomRequest,
  ): Promise<StoredRoom> {
    return this.useStore((store) => store.createRoom(tenantId, payload));
  }

  async updateRoom(
    roomId: string,
    patch: Partial<CreateRoomRequest>,
  ): Promise<StoredRoom | undefined> {
    return this.useStore((store) => store.updateRoom(roomId, patch));
  }

  async deleteRoom(roomId: string): Promise<StoredRoom | undefined> {
    return this.useStore((store) => store.deleteRoom(roomId));
  }

  async updatePrizeRounds(matchId: string, payload: UpdatePrizeRoundsRequest) {
    return this.useStore((store) => store.updatePrizeRounds(matchId, payload));
  }

  async setPrizeShowcase(matchId: string, payload: PrizeShowcaseRequest) {
    return this.useStore((store) => store.setPrizeShowcase(matchId, payload));
  }

  async setStageMoment(matchId: string, payload: StageMomentRequest) {
    return this.useStore((store) => store.setStageMoment(matchId, payload));
  }

  async setRecentDrawsShowcase(matchId: string, payload: TvRecentDrawsRequest) {
    return this.useStore((store) =>
      store.setRecentDrawsShowcase(matchId, payload),
    );
  }

  async resetTvPresentation(matchId: string) {
    return this.useStore((store) => store.resetTvPresentation(matchId));
  }

  async updateMatchStatus(
    matchId: string,
    status: MatchStatus,
  ): Promise<StoredMatch | undefined> {
    return this.useStore((store) => store.updateMatchStatus(matchId, status));
  }

  async appendDraw(
    matchId: string,
    payload: DrawEntryCommand & {
      actorUserId?: string;
      type?: StoredDrawEvent['type'];
      correctedFromId?: string;
    },
  ): Promise<StoredDrawEvent | undefined> {
    return this.useStore((store) => store.appendDraw(matchId, payload));
  }

  async createWinClaim(params: CreateWinClaimParams): Promise<StoredWinClaim> {
    return this.useStore((store) => store.createWinClaim(params));
  }

  async appendAuditLog(params: AppendAuditLogParams): Promise<StoredAuditLog> {
    return this.useStore((store) => store.appendAuditLog(params));
  }

  async getRoomHistory(
    roomId: string,
    matchId?: string,
  ): Promise<StoredAdminHistory> {
    return this.useStore((store) => store.getRoomHistory(roomId, matchId));
  }

  async createPlayerSession(params: {
    roomId: string;
    name: string;
    avatar?: string;
    cardsRequested: number;
  }): Promise<StoredPlayerSession> {
    return this.useStore((store) => store.createPlayerSession(params));
  }

  async generatePrintableCards(
    roomId: string,
    quantity: number,
    printBatchId: string,
  ): Promise<StoredCard[]> {
    return this.useStore((store) =>
      store.generatePrintableCards(roomId, quantity, printBatchId),
    );
  }

  async getPrintableCardByAccessCode(
    accessCode: string,
  ): Promise<StoredPrintedCard | undefined> {
    return this.useStore((store) =>
      store.getPrintableCardByAccessCode(accessCode),
    );
  }

  async findPrintableCardForRoom(
    roomId: string,
    codeOrSerial: string,
  ): Promise<StoredCard | undefined> {
    return this.useStore((store) =>
      store.findPrintableCardForRoom(roomId, codeOrSerial),
    );
  }

  async updatePlayerSession(
    playerSessionId: string,
    patch: UpdatePlayerRequest,
  ): Promise<StoredPlayerSession | undefined> {
    return this.useStore((store) =>
      store.updatePlayerSession(playerSessionId, patch),
    );
  }

  async deletePlayerSession(
    playerSessionId: string,
  ): Promise<StoredPlayerSession | undefined> {
    return this.useStore((store) => store.deletePlayerSession(playerSessionId));
  }

  private async useStore<T>(
    callback: (store: PrismaBingoStoreService) => T | Promise<T>,
  ): Promise<T> {
    await this.ensurePrismaReady();
    return callback(this.prismaStore);
  }

  private async ensurePrismaReady() {
    if (this.prismaReady) {
      return;
    }

    const configured = (
      process.env.BINGO_PERSISTENCE ?? 'prisma'
    ).toLowerCase();
    if (configured === 'demo') {
      throw new Error(
        'O modo demo foi removido. Configure DATABASE_URL e use a persistencia Prisma.',
      );
    }

    const available = await this.prismaStore.isAvailable();
    if (!available) {
      throw new Error(
        'Persistencia Prisma obrigatoria. Configure DATABASE_URL e execute npm run prisma:push antes de iniciar a API.',
      );
    }

    this.prismaReady = true;
    this.logger.log('Persistencia Prisma ativa.');
  }
}
