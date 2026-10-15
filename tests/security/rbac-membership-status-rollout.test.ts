import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/security/rbac.ts', 'utf8');
const start = source.indexOf('export async function getOrganizationMembership(');
const end = source.indexOf('export async function assertOrganizationPermission(', start);
const membershipSource = source.slice(start, end);

describe('RBAC canonical membership status boundary', () => {
  it('queries status and never uses legacy status-free projection', () => {
    expect(membershipSource).toContain(".select('organization_id, role, status')");
    expect(membershipSource).not.toContain(".select('organization_id, role')");
    expect(membershipSource).not.toContain("status: 'active'");
    expect(membershipSource).not.toContain("membershipError?.code === '42703'");
  });

  it('fails closed when the status-aware query returns any error', () => {
    expect(membershipSource).toContain('if (membershipError)');
    expect(membershipSource).toContain('return { membership: null, error: membershipError }');
    expect(membershipSource).toContain('!isActiveOrganizationMembership(membership.status)');
    expect(membershipSource).toContain('return { membership: null, error: null }');
  });
});
