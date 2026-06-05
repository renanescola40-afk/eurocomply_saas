import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, clearRateLimitBuckets } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it('allows requests below the limit', () => {
    const first = checkRateLimit({ key: 'user:1', limit: 2, windowMs: 1000, now: 0 });
    const second = checkRateLimit({ key: 'user:1', limit: 2, windowMs: 1000, now: 100 });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks requests after the limit is reached', () => {
    checkRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 0 });
    const blocked = checkRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 100 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets the bucket after the window expires', () => {
    checkRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 0 });
    const afterReset = checkRateLimit({ key: 'user:1', limit: 1, windowMs: 1000, now: 1001 });

    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });
});
