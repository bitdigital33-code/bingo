export const BINGO_LETTERS = ["B", "I", "N", "G", "O"] as const;

export type BingoLetter = (typeof BINGO_LETTERS)[number];

export type MemberRole = "owner" | "admin" | "operator";
export type MatchStatus = "draft" | "live" | "paused" | "completed";
export type DrawEventType = "draw" | "correction" | "revert";
export type PrizePattern =
  | "single_line"
  | "double_line"
  | "full_house"
  | "marked_count";
export type ThemeKey = "natal" | "cassino" | "neon" | "junina" | "infantil";
export type ProximityBucket = 0 | 1 | 2 | 3;
export type WinClaimStatus = "pending" | "confirmed" | "rejected";
export type AuditActorType = "admin" | "player" | "system";
export type AdminHistoryItemType = "audit" | "win_claim";
export type StageMomentKey =
  | "warmup"
  | "attention"
  | "next_prize"
  | "last_call"
  | "celebration"
  | "near_win";

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
  targetMarks?: number;
  order: number;
  prize: string;
  description?: string;
  hasPhoto?: boolean;
  completedAt?: string;
}

export interface PrizeShowcaseDto {
  visible: boolean;
  roundId: string;
  label: string;
  pattern: PrizePattern;
  targetMarks?: number;
  order: number;
  prize: string;
  description?: string;
  hasPhoto?: boolean;
  photoDataUrl?: string;
  completedAt?: string;
}

export interface StageMomentDto {
  visible: boolean;
  key: StageMomentKey;
  title: string;
  message: string;
  expiresAt?: string;
}

export interface BingoCellDto {
  letter: BingoLetter;
  value: number | "FREE";
  row: number;
  col: number;
  marked: boolean;
}

export interface PrintableBingoCellDto {
  letter: BingoLetter;
  value: number | "FREE";
  row: number;
  col: number;
}

export interface PrintableCardDto {
  id: string;
  serial: string;
  cells: PrintableBingoCellDto[][];
  digitalAccessCode?: string;
  verificationCode?: string;
  digitalUrl?: string;
  qrValue?: string;
  issuedAt?: string;
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
  tone: "hype" | "warning" | "winner";
  message: string;
  speechText: string;
  sound: "spark" | "winner" | "alert";
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

export interface WinClaimDto {
  id: string;
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
  createdAt: string;
}

export interface AuditLogDto {
  id: string;
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
  createdAt: string;
}

export interface AdminHistoryItemDto {
  id: string;
  type: AdminHistoryItemType;
  occurredAt: string;
  action: string;
  summary: string;
  actorType: AuditActorType;
  actorName?: string;
  roomId?: string;
  matchId?: string;
  playerSessionId?: string;
  winClaimId?: string;
  drawEventId?: string;
  payload?: Record<string, unknown>;
}

export interface AdminHistoryResponseDto {
  roomId: string;
  roomName: string;
  roomCode: string;
  matchId?: string;
  items: AdminHistoryItemDto[];
  auditLogs: AuditLogDto[];
  winClaims: WinClaimDto[];
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
  prizeShowcase?: PrizeShowcaseDto;
  stageMoment?: StageMomentDto;
  recentDrawsVisible: boolean;
  tvStandby: boolean;
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
  endedAt?: string;
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

export interface BootstrapResponseDto {
  persistenceMode: "prisma";
  rooms: RoomSnapshot[];
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

export interface ClaimResponseDto {
  room: RoomSnapshot;
  claimant?: {
    id: string;
    name: string;
  };
  winner?: WinnerResult;
  claim: WinClaimDto;
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

export interface CreatePrizeRoundRequest {
  label: string;
  pattern: PrizePattern;
  targetMarks?: number;
  prize: string;
  description?: string;
  photoDataUrl?: string;
}

export interface CreateRoomRequest {
  name: string;
  theme: ThemeKey;
  maxCardsPerPlayer: number;
  allowAutoMark: boolean;
  allowManualMark: boolean;
  prizeRounds?: CreatePrizeRoundRequest[];
}

export interface DeleteRoomResponseDto {
  deletedRoomId: string;
  rooms: RoomSnapshot[];
}

export interface UpdatePlayerRequest {
  name?: string;
  avatar?: string;
  autoMark?: boolean;
}

export interface GeneratePrintableCardsRequest {
  quantity: number;
  title?: string;
  cardsPerPage?: 2 | 4 | 6;
}

export interface GeneratePrintableCardsResponse {
  roomId: string;
  roomName: string;
  roomCode: string;
  title: string;
  generatedAt: string;
  cardsPerPage: 2 | 4 | 6;
  cards: PrintableCardDto[];
}

export interface PrintedCardDigitalResponseDto {
  roomId: string;
  roomName: string;
  roomCode: string;
  tenantName: string;
  theme: ThemeKey;
  issuedAt?: string;
  card: PrintableCardDto;
}

export interface VerifyPrintableCardRequest {
  code: string;
}

export interface VerifyPrintableCardResponseDto {
  authentic: boolean;
  reason?: string;
  roomId: string;
  roomName: string;
  roomCode: string;
  card?: PrintableCardDto;
}

export interface UpdatePrizeRoundRequest {
  id?: string;
  label: string;
  pattern: PrizePattern;
  targetMarks?: number;
  prize: string;
  description?: string;
  photoDataUrl?: string;
  removePhoto?: boolean;
}

export interface UpdatePrizeRoundsRequest {
  rounds: UpdatePrizeRoundRequest[];
}

export interface PrizeShowcaseRequest {
  roundId?: string;
  visible: boolean;
}

export interface StageMomentRequest {
  key?: StageMomentKey;
  title?: string;
  message?: string;
  durationSeconds?: number;
  visible: boolean;
}

export interface TvRecentDrawsRequest {
  visible: boolean;
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
