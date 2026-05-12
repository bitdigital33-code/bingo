import type {
  AdminHistoryItemDto,
  AuditActorType,
  BingoLetter,
  AuditLogDto,
  DrawEventDto,
  MatchStatus,
  MemberRole,
  PrizePattern,
  StageMomentKey,
  ThemeKey,
  WinClaimDto,
  WinClaimStatus,
} from '@bingo/contracts';

export interface StoredTenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface StoredUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: MemberRole;
  createdAt: string;
}

export interface StoredCardCell {
  letter: BingoLetter;
  value: number | 'FREE';
  row: number;
  col: number;
}

export interface StoredCard {
  id: string;
  serial: string;
  cells: StoredCardCell[][];
  printedRoomId?: string;
  printBatchId?: string;
  digitalAccessCode?: string;
  printedAt?: string;
}

export interface StoredPrintedCard extends StoredCard {
  room: StoredRoom;
  tenantName: string;
}

export interface StoredPlayerSession {
  id: string;
  roomId: string;
  name: string;
  avatar: string;
  token: string;
  autoMark: boolean;
  cards: StoredCard[];
  createdAt: string;
}

export interface StoredRoom {
  id: string;
  tenantId: string;
  name: string;
  joinCode: string;
  theme: ThemeKey;
  allowAutoMark: boolean;
  allowManualMark: boolean;
  maxCardsPerPlayer: number;
  createdAt: string;
  matchId: string;
}

export interface StoredDrawEvent extends DrawEventDto {
  actorUserId?: string;
}

export interface StoredWinClaim extends WinClaimDto {
  status: WinClaimStatus;
}

export interface StoredAuditLog extends AuditLogDto {
  actorType: AuditActorType;
}

export interface StoredPrizeRound {
  id: string;
  label: string;
  pattern: PrizePattern;
  targetMarks?: number;
  order: number;
  prize: string;
  description?: string;
  photoDataUrl?: string;
  photoUpdatedAt?: string;
  completedAt?: string;
}

export interface StoredAdminHistory {
  items: AdminHistoryItemDto[];
  auditLogs: StoredAuditLog[];
  winClaims: StoredWinClaim[];
}

export interface CreateWinClaimParams {
  tenantId?: string;
  roomId?: string;
  matchId: string;
  playerSessionId?: string;
  playerName?: string;
  roundId?: string;
  cardId?: string;
  triggeredByDrawId?: string;
  status: WinClaimStatus;
  reason?: string;
  snapshot?: Record<string, unknown>;
}

export interface AppendAuditLogParams {
  tenantId: string;
  roomId?: string;
  matchId?: string;
  userId?: string;
  actorType: AuditActorType;
  actorName?: string;
  action: string;
  summary?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

export interface StoredMatch {
  id: string;
  roomId: string;
  status: MatchStatus;
  startedAt?: string;
  pausedAt?: string;
  endedAt?: string;
  featuredPrizeRoundId?: string;
  prizeShowcaseVisible: boolean;
  stageMomentKey?: StageMomentKey;
  stageMomentTitle?: string;
  stageMomentMessage?: string;
  stageMomentExpiresAt?: string;
  stageMomentVisible: boolean;
  recentDrawsVisible: boolean;
  tvResetAt?: string;
  prizeRounds: StoredPrizeRound[];
  drawEvents: StoredDrawEvent[];
}

export interface InvitePayload {
  name: string;
  email: string;
  password?: string;
  role: MemberRole;
}
