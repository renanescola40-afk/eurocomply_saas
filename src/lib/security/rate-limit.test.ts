import { beforeEach, describe, expect, it } from 'vitest';
import { checkDistributedRateLimit, clearRateLimitBuckets } from './rate-limit';

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe('checkDistributedRateLimit local fallback', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    setNodeEnv('test');
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

  it('infers enterprise policy categories for legacy sensitive keys', async () => {
    const billing = await checkDistributedRateLimit({ key: 'billing:checkout:org:user', limit: 5, windowMs: 1000, now: 0 });
    const upload = await checkDistributedRateLimit({ key: 'documents:upload:org:user', limit: 5, windowMs: 1000, now: 0 });
    const stepUp = await checkDistributedRateLimit({ key: 'step-up:challenge:org:user', limit: 5, windowMs: 1000, now: 0 });
    const exportLimit = await checkDistributedRateLimit({ key: 'evidence-pack:export:org:user', limit: 5, windowMs: 1000, now: 0 });

    expect(billing.category).toBe('billing');
    expect(upload.category).toBe('upload');
    expect(stepUp.category).toBe('step-up');
    expect(exportLimit.category).toBe('export');
  });
});
