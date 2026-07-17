import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/subscription.ts', import.meta.url);

describe('subscription plan read failure contract', () => {
  it('propagates unexpected provider and database failures', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const lookup = source.slice(
      source.indexOf('async function getLatestSubscriptionRow'),
      source.indexOf('export async function getOrganizationPlan'),
    );

    expect(source).toContain("const SUBSCRIPTION_PLAN_UNAVAILABLE = 'subscription_plan_unavailable';");
    expect(lookup).toContain("console.warn('[subscription] plan_lookup_failed'");
    expect(lookup).toContain('throw new Error(SUBSCRIPTION_PLAN_UNAVAILABLE);');
    expect(lookup).not.toContain("console.warn('[subscription] plan_lookup_failed', { code: error.code ?? 'unknown' });\n    return null;");
  });

  it('limits schema fallback to PostgreSQL undefined-column errors', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const lookup = source.slice(
      source.indexOf('async function getLatestSubscriptionRow'),
      source.indexOf('export async function getOrganizationPlan'),
    );

    expect(lookup).toContain("if (error.code === '42703') return null;");
    expect(source).toContain("getLatestSubscriptionRow(organizationId, 'plan,status,created_at')");
    expect(source).toContain("getLatestSubscriptionRow(organizationId, 'tier,status,created_at')");
  });

  it('keeps starter only for successful lookups without a paid subscription', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("return 'starter';");
    expect(source).toContain(".eq('organization_id', organizationId)");
    expect(source).toContain(".in('status', ['active', 'trialing'])");
    expect(source).toContain('.maybeSingle<OrganizationSubscriptionRow>()');
  });
});
