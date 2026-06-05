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

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
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

export function clearRateLimitBuckets() {
  buckets.clear();
}
