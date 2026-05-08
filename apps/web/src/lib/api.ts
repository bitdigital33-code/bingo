import type {
  AuthResponseDto,
  CreateRoomRequest,
  DrawEntryCommand,
  JoinRoomRequest,
  JoinRoomResponse,
  LoginRequest,
  RoomSnapshot,
} from '@bingo/contracts';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Falha ao comunicar com o servidor.');
  }

  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_URL,
  login(payload: LoginRequest) {
    return request<AuthResponseDto>('/api/v1/auth/login', {
      method: 'POST',
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
    return request<AuthResponseDto>('/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  refresh(refreshToken: string) {
    return request<AuthResponseDto>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  bootstrap(token: string) {
    return request<{ demoCredentials: { email: string; password: string }; rooms: RoomSnapshot[] }>(
      '/api/v1/auth/bootstrap',
      undefined,
      token,
    );
  },
  listRooms(token: string) {
    return request<RoomSnapshot[]>('/api/v1/rooms', undefined, token);
  },
  inviteMember(
    token: string,
    payload: { name: string; email: string; role: 'owner' | 'admin' | 'operator'; password?: string },
  ) {
    return request('/api/v1/members/invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },
  createRoom(token: string, payload: CreateRoomRequest) {
    return request<{ room: RoomSnapshot }>(
      '/api/v1/rooms',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  updateRoom(token: string, roomId: string, payload: Partial<CreateRoomRequest>) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  startMatch(token: string, roomId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/rooms/${roomId}/start-match`,
      {
        method: 'POST',
      },
      token,
    );
  },
  pauseMatch(token: string, matchId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/pause`,
      {
        method: 'POST',
      },
      token,
    );
  },
  resumeMatch(token: string, matchId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/resume`,
      {
        method: 'POST',
      },
      token,
    );
  },
  endMatch(token: string, matchId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/end`,
      {
        method: 'POST',
      },
      token,
    );
  },
  addDraw(token: string, matchId: string, payload: DrawEntryCommand) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/draws`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  correctDraw(token: string, matchId: string, drawId: string, payload: DrawEntryCommand) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/draws/${drawId}/correct`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  revertDraw(token: string, matchId: string, drawId: string) {
    return request<{ room: RoomSnapshot }>(
      `/api/v1/matches/${matchId}/draws/${drawId}/revert`,
      {
        method: 'POST',
      },
      token,
    );
  },
  replayLast(token: string, matchId: string) {
    return request<{ room: RoomSnapshot; replay?: unknown }>(
      `/api/v1/matches/${matchId}/replay-last`,
      {
        method: 'POST',
      },
      token,
    );
  },
  claim(matchId: string, playerToken?: string) {
    return request<{ room: RoomSnapshot }>(`/api/v1/matches/${matchId}/claims`, {
      method: 'POST',
      body: JSON.stringify({ playerToken }),
    });
  },
  getRoomState(joinCode: string) {
    return request<RoomSnapshot>(`/public/rooms/${joinCode}/state`);
  },
  getTvState(joinCode: string) {
    return request<RoomSnapshot>(`/public/rooms/${joinCode}/tv-state`);
  },
  joinRoom(joinCode: string, payload: JoinRoomRequest) {
    return request<JoinRoomResponse>(`/public/rooms/${joinCode}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
