import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(join(process.cwd(), 'src/app/api/team/members/role/route.ts'), 'utf8');

describe('team member role route security contract', () => {
  it('uses the central API guard helpers for identity, permission, mutation, and error handling', () => {
    expect(routeSource).toContain('requireApiUser');
    expect(routeSource).toContain('requirePermission');
    expect(routeSource).toContain('requireTrustedMutation');
    expect(routeSource).toContain('secureApiError');
  });

  it('scopes member lookup and update by organization_id', () => {
    const organizationScopeChecks = routeSource.match(/\.eq\('organization_id', organization\.id\)/g) ?? [];

    expect(organizationScopeChecks.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps step-up and audit requirements for role changes', () => {
    expect(routeSource).toContain('requireStepUpForRequest');
    expect(routeSource).toContain('team_member_role_changed');
  });
});
