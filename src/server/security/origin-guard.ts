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

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

function getCanonicalRequestOrigins(request: Request) {
  const origins = new Set<string>();

  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // The forwarded host below can still provide the canonical public origin.
  }

  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const host = forwardedHost ?? firstHeaderValue(request.headers.get('host'));
  if (!host) return origins;

  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  let protocol = forwardedProto;

  if (!protocol) {
    try {
      protocol = new URL(request.url).protocol.replace(':', '');
    } catch {
      protocol = 'https';
    }
  }

  try {
    origins.add(new URL(`${protocol}://${host}`).origin);
  } catch {
    // Invalid forwarding headers must not become trusted origins.
  }

  return origins;
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

  const canonicalRequestOrigins = getCanonicalRequestOrigins(request);
  if (canonicalRequestOrigins.has(origin) || trustedOrigins.has(origin)) {
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
