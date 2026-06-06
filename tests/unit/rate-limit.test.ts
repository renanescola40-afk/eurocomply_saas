import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, clearRateLimitBuckets } from '@/lib/security/rate-limit';

describe('local rate limiting fallback', () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it('allows requests inside the window until the limit is reached', () => {
    const first = checkRateLimit({ key: 'unit:test', limit: 2, windowMs: 60_000, now: 1_000 });
    const second = checkRateLimit({ key: 'unit:test', limit: 2, windowMs: 60_000, now: 2_000 });
    const third = checkRateLimit({ key: 'unit:test', limit: 2, windowMs: 60_000, now: 3_000 });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('resets after the window expires', () => {
    checkRateLimit({ key: 'unit:reset', limit: 1, windowMs: 1_000, now: 1_000 });
    const blocked = checkRateLimit({ key: 'unit:reset', limit: 1, windowMs: 1_000, now: 1_500 });
    const allowedAgain = checkRateLimit({ key: 'unit:reset', limit: 1, windowMs: 1_000, now: 2_001 });

    expect(blocked.allowed).toBe(false);
    expect(allowedAgain.allowed).toBe(true);
  });
});
