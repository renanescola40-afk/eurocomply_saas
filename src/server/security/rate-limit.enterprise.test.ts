import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildRateLimitKey,
  checkDistributedRateLimit,
  clearRateLimitBuckets,
  getRateLimitHeaders,
  hashRateLimitIp,
  type RateLimitCategory,
} from './rate-limit';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VERCEL_ENV;
  Object.assign(process.env, { NODE_ENV: 'test' });
}

async function hit(category: RateLimitCategory, organizationId = 'org-a') {
  return checkDistributedRateLimit({
    category,
    userId: 'user-a',
    organizationId,
    ip: '203.0.113.10',
    action: 'test-action',
    route: '/api/test',
    limit: 2,
    windowMs: 60_000,
    now: 1_000,
  });
}

describe('enterprise rate limiting', () => {
  beforeEach(() => {
    resetEnv();
    clearRateLimitBuckets();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetEnv();
    clearRateLimitBuckets();
  });

  it('allows requests below the configured limit', async () => {
    const first = await hit('billing');
    const second = await hit('billing');

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks requests above the configured limit', async () => {
    await hit('billing');
    await hit('billing');
    const blocked = await hit('billing');

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.audit).toBe(true);
  });

  it('fails closed for high-risk production routes when Redis is not configured', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await checkDistributedRateLimit({
      category: 'billing',
      userId: 'user-a',
      organizationId: 'org-a',
      ip: '203.0.113.10',
      action: 'checkout',
      route: '/api/billing/checkout',
    });

    expect(result.allowed).toBe(false);
    expect(result.failureMode).toBe('fail-closed');
    expect(result.reason).toBe('redis_not_configured');
  });

  it('degrades open for low-risk production routes when Redis is not configured', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await checkDistributedRateLimit({
      category: 'general-api',
      userId: 'user-a',
      organizationId: 'org-a',
      ip: '203.0.113.10',
      action: 'read',
      route: '/api/general',
    });

    expect(result.allowed).toBe(true);
    expect(result.failureMode).toBe('fail-open');
    expect(result.reason).toBe('redis_not_configured');
  });

  it('does not share tenant buckets across organizations', async () => {
    await hit('export', 'org-a');
    await hit('export', 'org-a');
    const orgABlocked = await hit('export', 'org-a');
    const orgBFirst = await hit('export', 'org-b');

    expect(orgABlocked.allowed).toBe(false);
    expect(orgBFirst.allowed).toBe(true);
    expect(orgBFirst.remaining).toBe(1);
  });

  it('uses hashed IP material in keys and emits standard rate limit headers', async () => {
    const key = buildRateLimitKey('auth', {
      userId: null,
      organizationId: null,
      ip: '203.0.113.10',
      action: 'password-reset',
      route: '/api/auth/password/reset',
    });
    const ipHash = hashRateLimitIp('203.0.113.10');
    const result = await hit('auth');
    const headers = getRateLimitHeaders(result, result.resetAt - 10_000);

    expect(key).toContain(ipHash);
    expect(key).not.toContain('203.0.113.10');
    expect(headers['Retry-After']).toBe('10');
    expect(headers['RateLimit-Limit']).toBe(String(result.limit));
    expect(headers['RateLimit-Remaining']).toBe(String(result.remaining));
    expect(headers['RateLimit-Reset']).toBe('10');
  });
});
