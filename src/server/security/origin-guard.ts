import { noStoreJson } from './no-store';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type OriginGuardResult =
  | { ok: true; reason: 'safe_method' | 'trusted_origin' | 'development_no_origin' }
  | { ok: false; reason: 'missing_origin' | 'untrusted_origin' | 'invalid_origin'; origin: string | null };

function parseOrigins(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin));
}

function parseVercelHostname(value: string | undefined) {
  const hostname = value?.trim();
  if (!hostname) return [];

  try {
    return [new URL(hostname.includes('://') ? hostname : `https://${hostname}`).origin];
  } catch {
    return [];
  }
}

export function getTrustedOrigins() {
  return new Set([
    ...parseOrigins(process.env.NEXT_PUBLIC_APP_URL),
    ...parseOrigins(process.env.TRUSTED_ORIGINS),
    ...parseVercelHostname(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    ...parseVercelHostname(process.env.VERCEL_URL),
  ]);
}

function readOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) return origin;

  const referer = request.headers.get('referer');
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return 'invalid';
  }
}

function getRequestOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function verifyTrustedOrigin(request: Request, trustedOrigins = getTrustedOrigins()): OriginGuardResult {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return { ok: true, reason: 'safe_method' };
  }

  const origin = readOrigin(request);

  if (!origin) {
    if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
      return { ok: true, reason: 'development_no_origin' };
    }

    return { ok: false, reason: 'missing_origin', origin: null };
  }

  if (origin === 'invalid') {
    return { ok: false, reason: 'invalid_origin', origin };
  }

  const requestOrigin = getRequestOrigin(request);
  if (origin === requestOrigin || trustedOrigins.has(origin)) {
    return { ok: true, reason: 'trusted_origin' };
  }

  return { ok: false, reason: 'untrusted_origin', origin };
}

export function originDeniedResponse(result: Extract<OriginGuardResult, { ok: false }>) {
  return noStoreJson(
    {
      error: 'untrusted_origin',
      reason: result.reason,
    },
    { status: 403 },
  );
}

export function assertTrustedOrigin(request: Request) {
  const result = verifyTrustedOrigin(request);
  if (!result.ok) {
    return originDeniedResponse(result);
  }

  return null;
}
