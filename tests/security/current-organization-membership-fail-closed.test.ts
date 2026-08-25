import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/current-organization.ts', import.meta.url);
const LEGACY_QUERY_FILE = new URL('../../src/server/queries/organizations.ts', import.meta.url);

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

  it('treats active membership status as mandatory tenant read authority when the status column exists', async () => {
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

  it('consolidates the legacy organization helper onto the canonical membership boundary', async () => {
    const legacySource = await readFile(LEGACY_QUERY_FILE, 'utf8');

    expect(legacySource).toContain("import { getUserOrganizationMemberships } from '@/server/queries/current-organization';");
    expect(legacySource).toContain('const memberships = await getUserOrganizationMemberships(userId);');
    expect(legacySource).not.toContain(".from('organization_members')");
    expect(legacySource).not.toContain('createAdminClient');
  });

  it('does not convert membership lookup failures into a no-organization state', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(membershipRead).toContain("console.warn('[organization] memberships_lookup_failed'");
    expect(membershipRead).toContain("console.warn('[organization] memberships_status_aware_fallback_failed'");
    expect(membershipRead).toContain("console.warn('[organization] membership_status_capability_probe_failed_closed'");
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
    expect(membershipRead).toContain("supabase.rpc('live_rls_validation_has_column'");
    expect(membershipRead).toContain("table_name: 'organization_members'");
    expect(membershipRead).toContain("column_name: 'status'");
    expect(membershipRead).toContain('statusCapability.error || statusCapability.data !== false');
    expect(membershipRead).toContain(".select('organization_id, role, organizations(id, name, slug)')");
    expect(membershipRead).toContain("console.warn('[organization] membership_onboarding_columns_unavailable'");
    expect(membershipRead).not.toContain('createServerSupabaseClient');
  });

  it('permits the status-less compatibility read only after Postgres proves the status column is absent', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    const statusFailureGuard = membershipRead.indexOf('if (!isMissingMembershipStatusColumn(statusAwareFallback.error))');
    const capabilityProbe = membershipRead.indexOf("supabase.rpc('live_rls_validation_has_column'");
    const capabilityGate = membershipRead.indexOf('statusCapability.error || statusCapability.data !== false');
    const legacyQuery = membershipRead.indexOf(".select('organization_id, role, organizations(id, name, slug)')");
    expect(statusFailureGuard).toBeGreaterThan(-1);
    expect(capabilityProbe).toBeGreaterThan(statusFailureGuard);
    expect(capabilityGate).toBeGreaterThan(capabilityProbe);
    expect(legacyQuery).toBeGreaterThan(capabilityGate);
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
