import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/billing.ts', import.meta.url);

describe('billing context read failure contract', () => {
  it('requires the privileged client instead of returning a synthetic starter context', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).toContain('const supabase = createAdminClient();');
    expect(source).not.toContain('tryCreateAdminClient');
    expect(source).not.toContain('emptyBillingContext');
    expect(source).not.toContain('if (!supabase)');
  });

  it('fails closed when subscription or usage queries fail', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    const countRows = source.slice(
      source.indexOf('async function countRows'),
      source.indexOf('async function getSubscription'),
    );
    const getSubscription = source.slice(
      source.indexOf('async function getSubscription'),
      source.indexOf('export async function getOrganizationBillingContext'),
    );

    expect(countRows).toContain("console.warn('[billing] count_failed'");
    expect(countRows).toContain('throw new Error(BILLING_CONTEXT_UNAVAILABLE);');
    expect(countRows).not.toContain('return 0;');

    expect(getSubscription).toContain("console.warn('[billing] subscription_lookup_failed'");
    expect(getSubscription).toContain('throw new Error(BILLING_CONTEXT_UNAVAILABLE);');
    expect(getSubscription).not.toContain('return null;');
  });

  it('preserves tenant-scoped exact counts and conservative inactive-plan behavior', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain(".select('id', { count: 'exact', head: true })");
    expect(source).toContain(".eq('organization_id', organizationId)");
    expect(source).toContain("const SAFE_DEFAULT_PLAN = 'starter';");
    expect(source).toContain('hasPaidEntitlementStatus(status)');
    expect(source).toContain('return count ?? 0;');
  });
});
