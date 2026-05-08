export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

export type BingoLetter = (typeof BINGO_LETTERS)[number];

export type MemberRole = 'owner' | 'admin' | 'operator';
export type MatchStatus = 'draft' | 'live' | 'paused' | 'completed';
export type DrawEventType = 'draw' | 'correction' | 'revert';
export type PrizePattern = 'single_line' | 'double_line' | 'full_house';
export type ThemeKey = 'natal' | 'cassino' | 'neon' | 'junina' | 'infantil';
export type ProximityBucket = 0 | 1 | 2 | 3;

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface UserDto {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: MemberRole;
}

export interface ThemePresetDto {
  key: ThemeKey;
  label: string;
  accent: string;
  ambient: string;
}

export interface PrizeRoundConfig {
  id: string;
  label: string;
  pattern: PrizePattern;
  order: number;
  prize: string;
  completedAt?: string;
}

export interface BingoCellDto {
  letter: BingoLetter;
  value: number | 'FREE';
  row: number;
  col: number;
  marked: boolean;
}

export interface PlayerCardView {
  id: string;
  playerSessionId: string;
  autoMark: boolean;
  serial: string;
  cells: BingoCellDto[][];
  marksNeeded: number;
}

export interface PlayerSessionDto {
  id: string;
  roomId: string;
  name: string;
  avatar: string;
  cards: PlayerCardView[];
}

export interface DrawEventDto {
  id: string;
  matchId: string;
  letter: BingoLetter;
  value: number;
  display: string;
  type: DrawEventType;
  sequence: number;
  createdAt: string;
  correctedFromId?: string;
}

export interface ProximityEntry {
  playerSessionId: string;
  playerName: string;
  avatar: string;
  cardsNearWin: number;
  distance: ProximityBucket;
  message: string;
}

export interface AnnouncementCue {
  id: string;
  tone: 'hype' | 'warning' | 'winner';
  message: string;
  speechText: string;
  sound: 'spark' | 'winner' | 'alert';
}

export interface WinnerResult {
  roundId: string;
  pattern: PrizePattern;
  winners: Array<{
    playerSessionId: string;
    playerName: string;
    avatar: string;
    cardId: string;
  }>;
  triggeredByDrawId: string;
}

export interface MatchSnapshot {
  matchId: string;
  status: MatchStatus;
  roomId: string;
  roomCode: string;
  roomName: string;
  tenantName: string;
  activeTheme: ThemeKey;
  currentPrizeRoundId: string;
  prizeRounds: PrizeRoundConfig[];
  currentDraw?: DrawEventDto;
  recentDraws: DrawEventDto[];
  drawnNumbers: Array<{ letter: BingoLetter; value: number; display: string }>;
  playersOnline: number;
  players: PlayerSessionDto[];
  proximityBoard: ProximityEntry[];
  announcements: AnnouncementCue[];
  lastWinner?: WinnerResult;
  startedAt?: string;
  pausedAt?: string;
}

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  roomName: string;
  joinUrl: string;
  qrValue: string;
  theme: ThemeKey;
  allowAutoMark: boolean;
  allowManualMark: boolean;
  maxCardsPerPlayer: number;
  match: MatchSnapshot;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  tenant: TenantDto;
}

export interface DrawEntryCommand {
  letter: BingoLetter;
  value: number;
}

export interface JoinRoomRequest {
  name: string;
  avatar?: string;
  cardsRequested?: number;
}

export interface JoinRoomResponse {
  playerToken: string;
  player: PlayerSessionDto;
  room: RoomSnapshot;
}

export interface CreateTenantRequest {
  tenantName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateRoomRequest {
  name: string;
  theme: ThemeKey;
  maxCardsPerPlayer: number;
  allowAutoMark: boolean;
  allowManualMark: boolean;
}

export interface MatchCommandResponse {
  room: RoomSnapshot;
}

export interface SocketEnvelope<T = unknown> {
  event: string;
  payload: T;
}

export interface ThemeTokenSet {
  background: string;
  surface: string;
  accent: string;
  text: string;
  glow: string;
}
