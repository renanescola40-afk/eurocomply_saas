import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/security/rbac.ts', 'utf8');

describe('RBAC membership status rollout boundary', () => {
  it('queries canonical status first and permits a legacy projection only for the exact missing-column SQLSTATE', () => {
    expect(source).toContain(".select('organization_id, role, status')");
    expect(source).toContain("membershipError?.code === '42703'");
    expect(source).toContain(".select('organization_id, role')");
    expect(source).toContain("status: 'active'");
  });

  it('fails closed for non-active canonical memberships and for all other provider errors', () => {
    expect(source).toContain('if (membershipError)');
    expect(source).toContain('return { membership: null, error: membershipError }');
    expect(source).toContain('!isActiveOrganizationMembership(membership.status)');
    expect(source).toContain('return { membership: null, error: null }');
    expect(source).not.toContain("membershipError?.code === 'PGRST'");
  });
});
