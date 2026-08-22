import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildRateLimitKey,
  checkDistributedRateLimit,
  clearRateLimitBuckets,
  getRateLimitHeaders,
  hashRateLimitIp,
  hashRateLimitUserAgent,
  type RateLimitPolicyId,
} from './rate-limit';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VERCEL_ENV;
  Object.assign(process.env, { NODE_ENV: 'test' });
}

async function hit(policy: RateLimitPolicyId, organizationId = 'org-a') {
  return checkDistributedRateLimit({
    policy,
    userId: 'user-a',
    organizationId,
    ip: '203.0.113.10',
    userAgent: 'Vitest Browser',
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
    const first = await hit('billing-checkout');
    const second = await hit('billing-checkout');

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks requests above the configured limit', async () => {
    await hit('billing-checkout');
    await hit('billing-checkout');
    const blocked = await hit('billing-checkout');

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.audit).toBe(true);
    expect(blocked.policy).toBe('billing-checkout');
    expect(blocked.highRisk).toBe(true);
  });

  it('uses an explicit high-risk fail-closed team-management policy', async () => {
    await hit('team-management');
    await hit('team-management');
    const blocked = await hit('team-management');

    expect(blocked.allowed).toBe(false);
    expect(blocked.policy).toBe('team-management');
    expect(blocked.category).toBe('team');
    expect(blocked.failureMode).toBe('fail-closed');
    expect(blocked.highRisk).toBe(true);
    expect(blocked.audit).toBe(true);
  });

  it('fails closed for high-risk production routes when Redis is not configured', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await checkDistributedRateLimit({
      policy: 'billing-checkout',
      userId: 'user-a',
      organizationId: 'org-a',
      ip: '203.0.113.10',
      userAgent: 'Vitest Browser',
      action: 'checkout',
      route: '/api/billing/checkout',
    });

    expect(result.allowed).toBe(false);
    expect(result.failureMode).toBe('fail-closed');
    expect(result.reason).toBe('redis_not_configured');
    expect(result.audit).toBe(true);
  });

  it('does not block development/test high-risk routes just because Redis is unavailable', async () => {
    const result = await checkDistributedRateLimit({
      policy: 'gdpr-delete',
      userId: 'user-a',
      organizationId: 'org-a',
      ip: '203.0.113.10',
      userAgent: 'Vitest Browser',
      action: 'gdpr_delete',
      route: '/api/gdpr/delete-request',
      limit: 2,
      windowMs: 60_000,
      now: 1_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.failureMode).toBe('fail-closed');
  });

  it('degrades open for low-risk production routes when Redis is not configured', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await checkDistributedRateLimit({
      policy: 'general-api',
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

  it('honors policies that omit user-agent material even when callers supply it', () => {
    const common = {
      userId: null,
      organizationId: null,
      ip: '203.0.113.10',
      action: 'stripe_webhook',
      route: '/api/stripe/webhook',
    };
    const firstWebhookKey = buildRateLimitKey('webhook', {
      ...common,
      userAgent: 'Attacker UA 1',
    });
    const rotatedWebhookKey = buildRateLimitKey('webhook', {
      ...common,
      userAgent: 'Attacker UA 2',
    });
    const firstAuthKey = buildRateLimitKey('auth', {
      ...common,
      action: 'login',
      route: '/api/auth/login',
      userAgent: 'Browser A',
    });
    const secondAuthKey = buildRateLimitKey('auth', {
      ...common,
      action: 'login',
      route: '/api/auth/login',
      userAgent: 'Browser B',
    });

    expect(firstWebhookKey).toBe(rotatedWebhookKey);
    expect(firstWebhookKey).toContain('ua:omitted');
    expect(firstAuthKey).not.toBe(secondAuthKey);
  });

  it('uses hashed IP and user-agent material in keys and emits standard rate limit headers', async () => {
    const key = buildRateLimitKey('password-reset', {
      userId: null,
      organizationId: null,
      ip: '203.0.113.10',
      userAgent: 'Vitest Browser',
      action: 'password-reset',
      route: '/api/auth/password/reset',
    });
    const ipHash = hashRateLimitIp('203.0.113.10');
    const uaHash = hashRateLimitUserAgent('Vitest Browser');
    const result = await hit('auth');
    const headers = getRateLimitHeaders(result, result.resetAt - 10_000);

    expect(key).toContain(ipHash);
    expect(key).toContain(uaHash);
    expect(key).not.toContain('203.0.113.10');
    expect(key).not.toContain('Vitest Browser');
    expect(headers['Retry-After']).toBe('10');
    expect(headers['RateLimit-Limit']).toBe(String(result.limit));
    expect(headers['RateLimit-Remaining']).toBe(String(result.remaining));
    expect(headers['RateLimit-Reset']).toBe('10');
  });
});
