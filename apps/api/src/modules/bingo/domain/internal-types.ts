import type {
  BingoLetter,
  DrawEventDto,
  MatchStatus,
  MemberRole,
  PrizeRoundConfig,
  ThemeKey,
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

export interface StoredMatch {
  id: string;
  roomId: string;
  status: MatchStatus;
  startedAt?: string;
  pausedAt?: string;
  endedAt?: string;
  prizeRounds: PrizeRoundConfig[];
  drawEvents: StoredDrawEvent[];
}

export interface InvitePayload {
  name: string;
  email: string;
  password?: string;
  role: MemberRole;
}
