import { beforeEach, describe, expect, it } from 'vitest';
import { checkDistributedRateLimit, clearRateLimitBuckets } from './rate-limit';

describe('checkDistributedRateLimit local fallback', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.NODE_ENV = 'test';
    clearRateLimitBuckets();
  });

  it('allows requests below the limit', async () => {
    const first = await checkDistributedRateLimit({ key: 'user:1', limit: 2, windowMs: 1000, now: 0 });
    const second = await checkDistributedRateLimit({ key: 'user:1', limit: 2, windowMs: 1000, now: 100 });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks requests after the limit is reached', async () => {
    await checkDistributedRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 0 });
    const blocked = await checkDistributedRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 100 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets the bucket after the window expires', async () => {
    await checkDistributedRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 0 });
    const afterReset = await checkDistributedRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 1001 });

    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });
});
