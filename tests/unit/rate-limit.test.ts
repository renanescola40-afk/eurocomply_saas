import { beforeEach, describe, expect, it } from 'vitest';
import { checkDistributedRateLimit, clearRateLimitBuckets } from '@/lib/security/rate-limit';

describe('local rate limiting fallback', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.NODE_ENV = 'test';
    clearRateLimitBuckets();
  });

  it('allows requests inside the window until the limit is reached', async () => {
    const first = await checkDistributedRateLimit({ key: 'unit:test', limit: 2, windowMs: 60_000, now: 1_000 });
    const second = await checkDistributedRateLimit({ key: 'unit:test', limit: 2, windowMs: 60_000, now: 2_000 });
    const third = await checkDistributedRateLimit({ key: 'unit:test', limit: 2, windowMs: 60_000, now: 3_000 });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('resets after the window expires', async () => {
    await checkDistributedRateLimit({ key: 'unit:reset', limit: 1, windowMs: 1_000, now: 1_000 });
    const blocked = await checkDistributedRateLimit({ key: 'unit:reset', limit: 1, windowMs: 1_000, now: 1_500 });
    const allowedAgain = await checkDistributedRateLimit({ key: 'unit:reset', limit: 1, windowMs: 1_000, now: 2_001 });

    expect(blocked.allowed).toBe(false);
    expect(allowedAgain.allowed).toBe(true);
  });
});
