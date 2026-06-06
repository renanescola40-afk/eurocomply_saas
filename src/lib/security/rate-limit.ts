type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type UpstashPipelineResponse = Array<[unknown, unknown]>;

function getRedisConfig() {
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

async function upstashRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const config = getRedisConfig();

  if (!config) {
    return localRateLimit(options);
  }

  const now = options.now ?? Date.now();
  const redisKey = normalizeKey(options.key);
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));

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
  });

  if (!response.ok) {
    console.error('Upstash rate limit request failed', response.status);
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
}

export function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  return upstashRateLimit(options);
}

export function checkLocalRateLimit(options: RateLimitOptions): RateLimitResult {
  return localRateLimit(options);
}

export function clearRateLimitBuckets() {
  buckets.clear();
}
