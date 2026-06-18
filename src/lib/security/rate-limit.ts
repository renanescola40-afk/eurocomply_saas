type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitFailureReason = 'redis_not_configured' | 'redis_request_failed' | 'redis_unavailable';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  reason?: RateLimitFailureReason;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type UpstashPipelineResponse = Array<[unknown, unknown]>;

type RedisConfig = {
  url: string;
  token: string;
};

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function failClosed(options: RateLimitOptions, reason: RateLimitFailureReason): RateLimitResult {
  const now = options.now ?? Date.now();

  return {
    allowed: false,
    remaining: 0,
    resetAt: now + Math.max(options.windowMs, 1),
    reason,
  };
}

function getRedisConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return {
    url: url.replace(/\/$/, ''),
    token,
  };
}

function normalizeKey(key: string) {
  return `eurocomply:rate-limit:${key.replace(/[^a-zA-Z0-9:_-]/g, '_')}`;
}

function localRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(options.key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: Math.max(options.limit - 1, 0),
      resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  buckets.set(options.key, existing);

  return {
    allowed: true,
    remaining: Math.max(options.limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export async function checkDistributedRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const config = getRedisConfig();

  if (!config) {
    if (isProductionRuntime()) {
      console.error('[security:rate-limit] Upstash Redis is not configured; blocking production request.');
      return failClosed(options, 'redis_not_configured');
    }

    return localRateLimit(options);
  }

  const now = options.now ?? Date.now();
  const redisKey = normalizeKey(options.key);
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
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
      console.error('[security:rate-limit] Upstash Redis request failed; blocking in production.', {
        status: response.status,
      });

      if (isProductionRuntime()) return failClosed(options, 'redis_request_failed');
      return localRateLimit(options);
    }

    const results = (await response.json()) as UpstashPipelineResponse;
    const count = Number(results[0]?.[1] ?? 1);
    const ttlSeconds = Number(results[2]?.[1] ?? windowSeconds);
    const resetAt = now + Math.max(ttlSeconds, 0) * 1000;

    return {
      allowed: count <= options.limit,
      remaining: Math.max(options.limit - count, 0),
      resetAt,
    };
  } catch {
    console.error('[security:rate-limit] Upstash Redis unavailable; blocking in production.');

    if (isProductionRuntime()) return failClosed(options, 'redis_unavailable');
    return localRateLimit(options);
  }
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  if (isProductionRuntime()) {
    console.error('[security:rate-limit] Local rate limit requested in production; blocking request.');
    return failClosed(options, 'redis_not_configured');
  }

  return localRateLimit(options);
}

export function clearRateLimitBuckets() {
  buckets.clear();
}
