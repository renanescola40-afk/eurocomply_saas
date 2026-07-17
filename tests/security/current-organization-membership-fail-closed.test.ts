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

  it('does not convert membership lookup failures into a no-organization state', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(membershipRead).toContain("console.warn('[organization] memberships_lookup_failed'");
    expect(membershipRead).toContain("throw new Error('organization_memberships_unavailable');");
    expect(membershipRead).not.toContain('if (!supabase) return [];');
    expect(membershipRead).not.toMatch(/if \(error\)[\s\S]*?return \[\];/);
  });

  it('preserves user scoping, deterministic ordering, and bounded reads', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(membershipRead).toContain(".eq('user_id', userId)");
    expect(membershipRead).toContain(".order('created_at', { ascending: true })");
    expect(membershipRead).toContain('.range(0, safeLimit - 1)');
    expect(membershipRead).toContain('Math.max(1, Math.min(options.limit ?? 25, 100))');
  });

  it('still returns an empty list only after a successful zero-row query', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const membershipRead = source.slice(
      source.indexOf('export async function getUserOrganizationMemberships'),
      source.indexOf('export async function getCurrentOrganizationForUser'),
    );

    expect(membershipRead).toContain('return ((data ?? []) as RawOrganizationMembership[])');
  });
});
