type BrowserLocation = Pick<Location, 'origin' | 'protocol' | 'hostname'>;
type PublicEnv = {
  VITE_API_URL?: string;
  VITE_SOCKET_URL?: string;
};

function isLoopbackHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  );
}

function normalizePublicUrl(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\/$/, '') : fallback;
}

function resolveBrowserLocation(location: BrowserLocation | undefined) {
  if (!location) {
    return undefined;
  }

  if (location.origin && location.origin !== 'null') {
    return location.origin.replace(/\/$/, '');
  }

  return `${location.protocol}//${location.hostname}`;
}

function shouldIgnoreLoopbackOverride(
  value: string | undefined,
  location: BrowserLocation | undefined,
) {
  if (!value || !location || isLoopbackHost(location.hostname)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

function currentBrowserLocation(): BrowserLocation | undefined {
  return typeof window === 'undefined' ? undefined : window.location;
}

export function defaultApiUrl(location = currentBrowserLocation()) {
  return resolveBrowserLocation(location) ?? 'http://localhost:4000';
}

export function resolveApiUrl(
  env: PublicEnv = import.meta.env as PublicEnv,
  location = currentBrowserLocation(),
) {
  const fallback = defaultApiUrl(location);
  const configured = shouldIgnoreLoopbackOverride(env.VITE_API_URL, location)
    ? undefined
    : env.VITE_API_URL;
  return normalizePublicUrl(configured, fallback);
}

export function resolveSocketUrl(
  env: PublicEnv = import.meta.env as PublicEnv,
  location = currentBrowserLocation(),
) {
  const fallback = resolveApiUrl(env, location);
  const configured = shouldIgnoreLoopbackOverride(
    env.VITE_SOCKET_URL,
    location,
  )
    ? undefined
    : env.VITE_SOCKET_URL;
  return normalizePublicUrl(configured, fallback);
}

export const API_URL = resolveApiUrl();

export const SOCKET_URL = resolveSocketUrl();
