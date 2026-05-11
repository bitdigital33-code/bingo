function normalizePublicUrl(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\/$/, '') : fallback;
}

function defaultApiUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  return `${protocol}//${hostname}:4000`;
}

export const API_URL = normalizePublicUrl(
  import.meta.env.VITE_API_URL as string | undefined,
  defaultApiUrl(),
);

export const SOCKET_URL = normalizePublicUrl(
  import.meta.env.VITE_SOCKET_URL as string | undefined,
  API_URL,
);
