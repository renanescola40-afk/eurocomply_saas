import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/current-organization.ts', import.meta.url);

describe('current organization membership read failure contract', () => {
  it('requires the privileged client for tenant-context membership reads', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(source).not.toContain('tryCreateAdminClient');
    expect(membershipRead).toContain('const supabase = createAdminClient();');
  });

  it('treats active membership status as mandatory tenant read authority', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(source).toContain('status?: string | null;');
    expect(source).toContain("membership.status.trim().toLowerCase() !== 'active'");
    expect(membershipRead).toContain(".select('organization_id, role, status, organizations(id, name, slug, onboarding_status, onboarding_completed_at, selected_plan)')");
    expect(membershipRead).toContain(".select('organization_id, role, status, organizations(id, name, slug)')");
    expect(membershipRead.match(/\.eq\('status', 'active'\)/g)).toHaveLength(2);
  });

  it('does not convert membership lookup failures into a no-organization state', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(membershipRead).toContain("console.warn('[organization] memberships_lookup_failed'");
    expect(membershipRead).toContain("console.warn('[organization] memberships_status_aware_fallback_failed'");
    expect(membershipRead).toContain("console.warn('[organization] memberships_fallback_lookup_failed'");
    expect(membershipRead).toContain("throw new Error('organization_memberships_unavailable');");
    expect(membershipRead).not.toContain('if (!supabase) return [];');
  });

  it('keeps active status enforcement across onboarding schema fallback', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(source).toContain('function isExpectedSchemaFallback');
    expect(source).toContain('function isMissingMembershipStatusColumn');
    expect(source).toContain("error?.code === '42703'");
    expect(source).toContain("error?.code === 'PGRST204'");
    expect(membershipRead).toContain('if (isExpectedSchemaFallback(error))');
    expect(membershipRead).toContain('const statusAwareFallback = await supabase');
    expect(membershipRead).toContain('if (!statusAwareFallback.error)');
    expect(membershipRead).toContain('if (!isMissingMembershipStatusColumn(statusAwareFallback.error))');
    expect(membershipRead).toContain(".select('organization_id, role, organizations(id, name, slug)')");
    expect(membershipRead).toContain("console.warn('[organization] membership_onboarding_columns_unavailable'");
    expect(membershipRead).not.toContain('createServerSupabaseClient');
  });

  it('preserves user scoping, deterministic ordering, and bounded reads on every compatibility query', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(membershipRead.match(/\.eq\('user_id', userId\)/g)).toHaveLength(3);
    expect(membershipRead.match(/\.order\('created_at', \{ ascending: true \}\)/g)).toHaveLength(3);
    expect(membershipRead.match(/\.range\(0, safeLimit - 1\)/g)).toHaveLength(3);
    expect(membershipRead).toContain('Math.max(1, Math.min(options.limit ?? 25, 100))');
  });

  it('returns an empty list only after a successful bounded query', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(source).toContain('function normalizeMemberships(data: unknown)');
    expect(membershipRead).toContain('if (!error)');
    expect(membershipRead).toContain('return normalizeMemberships(data);');
    expect(membershipRead).toContain('if (!statusAwareFallback.error)');
    expect(membershipRead).toContain('return normalizeMemberships(statusAwareFallback.data);');
    expect(membershipRead).toContain('if (!legacy.error)');
    expect(membershipRead).toContain('return normalizeMemberships(legacy.data);');
  });
});
