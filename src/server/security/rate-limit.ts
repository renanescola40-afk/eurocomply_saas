type LocalRateLimitEntry = {
  count: number;
  resetAt: number;
};

type DistributedRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

const localAttempts = new Map<string, LocalRateLimitEntry>();

async function incrementUpstash(key: string, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const redisKey = `eurocomply:rate-limit:${key}`;

  const incrementResponse = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!incrementResponse.ok) {
    return null;
  }

  const incrementPayload = (await incrementResponse.json()) as { result?: number };
  const count = Number(incrementPayload.result ?? 0);

  if (count === 1) {
    await fetch(`${url}/expire/${encodeURIComponent(redisKey)}/${windowSeconds}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  }

  return count;
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

  try {
    const upstashCount = await incrementUpstash(key, safeWindowSeconds);
    if (typeof upstashCount === 'number') {
      return toRateLimitResult({
        count: upstashCount,
        limit,
        retryAfterSeconds: safeWindowSeconds,
      });
    }
  } catch (error) {
    console.warn('Upstash rate limit failed, using local fallback', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
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
