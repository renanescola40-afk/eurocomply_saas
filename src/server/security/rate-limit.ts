type LocalRateLimitEntry = {
  count: number;
  resetAt: number;
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
    localAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }

  const next = { ...current, count: current.count + 1 };
  localAttempts.set(key, next);
  return next.count;
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
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const upstashCount = await incrementUpstash(key, windowSeconds);
    if (typeof upstashCount === 'number') {
      return upstashCount > limit;
    }
  } catch (error) {
    console.warn('Upstash rate limit failed, using local fallback', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  return incrementLocal(key, windowMs) > limit;
}
