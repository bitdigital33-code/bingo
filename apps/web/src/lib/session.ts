import type { AuthResponseDto } from '@bingo/contracts';

const AUTH_KEY = 'bingo-premium-auth';

export interface StoredPlayerIdentity {
  playerId: string;
  playerToken: string;
  roomCode: string;
}

export function loadAuth() {
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return undefined;
  }

  return JSON.parse(raw) as AuthResponseDto;
}

export function saveAuth(auth: AuthResponseDto) {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  window.localStorage.removeItem(AUTH_KEY);
}

export function savePlayerIdentity(identity: StoredPlayerIdentity) {
  window.localStorage.setItem(`bingo-player:${identity.roomCode}`, JSON.stringify(identity));
}

export function loadPlayerIdentity(roomCode: string) {
  const raw = window.localStorage.getItem(`bingo-player:${roomCode}`);
  if (!raw) {
    return undefined;
  }
  return JSON.parse(raw) as StoredPlayerIdentity;
}
