import type {
  AdminHistoryResponseDto,
  AuthResponseDto,
  BootstrapResponseDto,
  ClaimResponseDto,
  CreateRoomRequest,
  DeleteRoomResponseDto,
  DrawEntryCommand,
  GeneratePrintableCardsRequest,
  GeneratePrintableCardsResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  LoginRequest,
  PrintedCardDigitalResponseDto,
  PrizeShowcaseRequest,
  RoomSnapshot,
  StageMomentRequest,
  TvRecentDrawsRequest,
  UpdatePrizeRoundsRequest,
  UpdatePlayerRequest,
  VerifyPrintableCardRequest,
  VerifyPrintableCardResponseDto,
} from "@bingo/contracts";
import { API_URL } from "./env";

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<T> {
  const hasBody = init?.body !== undefined;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha ao comunicar com o servidor.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_URL,
  login(payload: LoginRequest) {
    return request<AuthResponseDto>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createTenant(payload: {
    tenantName: string;
    slug: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
  }) {
    return request<AuthResponseDto>("/api/v1/tenants", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  refresh(refreshToken: string) {
    return request<AuthResponseDto>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },
  bootstrap(token: string) {
    return request<BootstrapResponseDto>(
      "/api/v1/auth/bootstrap",
      undefined,
      token,
    );
  },
  listRooms(token: string) {
    return request<RoomSnapshot[]>("/api/v1/rooms", undefined, token);
  },
  getRoomHistory(token: string, roomId: string) {
    return request<AdminHistoryResponseDto>(
      `/api/v1/rooms/${roomId}/history`,
      undefined,
      token,
    );
  },
  inviteMember(
    token: string,
    payload: {
      name: string;
      email: string;
      role: "owner" | "admin" | "operator";
      password?: string;
    },
  ) {
    return request(
      "/api/v1/members/invite",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  createRoom(token: string, payload: CreateRoomRequest) {
    return request<{ room: RoomSnapshot }>(
      "/api/v1/rooms",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  updateRoom(
    token: string,
    roomId: string,
    payload: Partial<CreateRoomRequest>,
  ) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  deleteRoom(token: string, roomId: string) {
    return request<DeleteRoomResponseDto>(
      `/api/v1/rooms/${roomId}`,
      {
        method: "DELETE",
      },
      token,
    );
  },
  generatePrintableCards(
    token: string,
    roomId: string,
    payload: GeneratePrintableCardsRequest,
  ) {
    return request<GeneratePrintableCardsResponse>(
      `/api/v1/rooms/${roomId}/print-cards`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  verifyPrintableCard(
    token: string,
    roomId: string,
    payload: VerifyPrintableCardRequest,
  ) {
    return request<VerifyPrintableCardResponseDto>(
      `/api/v1/rooms/${roomId}/print-cards/verify`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  updatePrizeRounds(
    token: string,
    roomId: string,
    payload: UpdatePrizeRoundsRequest,
  ) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/prize-rounds`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  setPrizeShowcase(
    token: string,
    roomId: string,
    payload: PrizeShowcaseRequest,
  ) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/prize-showcase`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  setStageMoment(token: string, roomId: string, payload: StageMomentRequest) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/stage-moment`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  resetTvPresentation(token: string, roomId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/tv/reset`,
      {
        method: "POST",
      },
      token,
    );
  },
  setRecentDrawsShowcase(
    token: string,
    roomId: string,
    payload: TvRecentDrawsRequest,
  ) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/tv/recent-draws`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  updatePlayer(
    token: string,
    roomId: string,
    playerId: string,
    payload: UpdatePlayerRequest,
  ) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/players/${playerId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  removePlayer(token: string, roomId: string, playerId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/players/${playerId}`,
      {
        method: "DELETE",
      },
      token,
    );
  },
  startMatch(token: string, roomId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/start-match`,
      {
        method: "POST",
      },
      token,
    );
  },
  pauseMatch(token: string, matchId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/pause`,
      {
        method: "POST",
      },
      token,
    );
  },
  resumeMatch(token: string, matchId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/resume`,
      {
        method: "POST",
      },
      token,
    );
  },
  endMatch(token: string, matchId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/end`,
      {
        method: "POST",
      },
      token,
    );
  },
  addDraw(token: string, matchId: string, payload: DrawEntryCommand) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/draws`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  correctDraw(
    token: string,
    matchId: string,
    drawId: string,
    payload: DrawEntryCommand,
  ) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/draws/${drawId}/correct`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  revertDraw(token: string, matchId: string, drawId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/draws/${drawId}/revert`,
      {
        method: "POST",
      },
      token,
    );
  },
  replayLast(token: string, matchId: string) {
    return request<{ room: RoomSnapshot; replay?: unknown }>(
      `/api/v1/matches/${matchId}/replay-last`,
      {
        method: "POST",
      },
      token,
    );
  },
  claim(matchId: string, playerToken?: string) {
    return request<ClaimResponseDto>(`/api/v1/matches/${matchId}/claims`, {
      method: "POST",
      body: JSON.stringify({ playerToken }),
    });
  },
  getRoomState(joinCode: string) {
    return request<RoomSnapshot>(`/public/rooms/${joinCode}/state`);
  },
  getTvState(joinCode: string) {
    return request<RoomSnapshot>(`/public/rooms/${joinCode}/tv-state`);
  },
  getPrintedCard(accessCode: string) {
    return request<PrintedCardDigitalResponseDto>(
      `/public/cards/${encodeURIComponent(accessCode)}`,
    );
  },
  joinRoom(joinCode: string, payload: JoinRoomRequest) {
    return request<JoinRoomResponse>(`/public/rooms/${joinCode}/join`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
