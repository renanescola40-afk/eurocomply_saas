type LocalRateLimitEntry = {
  count: number;
  resetAt: number;
};

type DistributedRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  reason?: 'redis_not_configured' | 'redis_request_failed' | 'redis_unavailable';
};

const localAttempts = new Map<string, LocalRateLimitEntry>();

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function failClosed(
  limit: number,
  retryAfterSeconds: number,
  reason: NonNullable<DistributedRateLimitResult['reason']>,
): DistributedRateLimitResult {
  return {
    allowed: false,
    limit,
    remaining: 0,
    retryAfterSeconds: Math.max(1, retryAfterSeconds),
    reason,
  };
}

function normalizeRedisKey(key: string) {
  return `eurocomply:rate-limit:${key.replace(/[^a-zA-Z0-9:_-]/g, '_')}`;
}

async function incrementUpstash(key: string, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const redisKey = normalizeRedisKey(key);

  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, windowSeconds, 'NX'],
      ['TTL', redisKey],
    ]),
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<[unknown, unknown]>;
  const count = Number(payload[0]?.[1] ?? 0);

  return Number.isFinite(count) ? count : null;
}

function incrementLocal(key: string, windowMs: number) {
  const now = Date.now();
  const current = localAttempts.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    localAttempts.set(key, next);
    return next;
  }

  const next = { ...current, count: current.count + 1 };
  localAttempts.set(key, next);
  return next;
}

function toRateLimitResult({
  count,
  limit,
  retryAfterSeconds,
}: {
  count: number;
  limit: number;
  retryAfterSeconds: number;
}): DistributedRateLimitResult {
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: count > limit ? Math.max(1, retryAfterSeconds) : 0,
  };
}

export async function checkDistributedRateLimit({
  key,
  limit,
  windowSeconds,
}: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<DistributedRateLimitResult> {
  const safeWindowSeconds = Math.max(1, Math.ceil(windowSeconds));
  const hasRedisConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  if (!hasRedisConfig) {
    if (isProductionRuntime()) {
      console.error('[security:rate-limit] Upstash Redis is not configured; blocking production request.');
      return failClosed(limit, safeWindowSeconds, 'redis_not_configured');
    }

    const now = Date.now();
    const local = incrementLocal(key, safeWindowSeconds * 1000);
    return toRateLimitResult({
      count: local.count,
      limit,
      retryAfterSeconds: Math.ceil((local.resetAt - now) / 1000),
    });
  }

  try {
    const upstashCount = await incrementUpstash(key, safeWindowSeconds);
    if (typeof upstashCount === 'number') {
      return toRateLimitResult({
        count: upstashCount,
        limit,
        retryAfterSeconds: safeWindowSeconds,
      });
    }

    console.error('[security:rate-limit] Upstash Redis request failed.');
    if (isProductionRuntime()) {
      return failClosed(limit, safeWindowSeconds, 'redis_request_failed');
    }
  } catch {
    console.error('[security:rate-limit] Upstash Redis unavailable.');
    if (isProductionRuntime()) {
      return failClosed(limit, safeWindowSeconds, 'redis_unavailable');
    }
  }

  const now = Date.now();
  const local = incrementLocal(key, safeWindowSeconds * 1000);

  return toRateLimitResult({
    count: local.count,
    limit,
    retryAfterSeconds: Math.ceil((local.resetAt - now) / 1000),
  });
}

export async function isRateLimited({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const result = await checkDistributedRateLimit({
    key,
    limit,
    windowSeconds: Math.ceil(windowMs / 1000),
  });

  return !result.allowed;
}
