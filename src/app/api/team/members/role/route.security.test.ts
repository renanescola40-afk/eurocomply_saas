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

  it('uses the loaded role as a compare-and-set predicate and verifies the affected row', () => {
    expect(routeSource).toContain("roleUpdate.is('role', null)");
    expect(routeSource).toContain("roleUpdate.eq('role', member.role)");
    expect(routeSource).toContain(".select('id')");
    expect(routeSource).toContain('.maybeSingle()');
    expect(routeSource).toContain("error: 'team_member_state_changed'");
    expect(routeSource).toContain('{ status: 409 }');
  });

  it('does not write success audit evidence before the transition is confirmed', () => {
    const stateChangedGuard = routeSource.indexOf("error: 'team_member_state_changed'");
    const auditWrite = routeSource.indexOf('const audit = await createAuditEvent');

    expect(stateChangedGuard).toBeGreaterThan(-1);
    expect(auditWrite).toBeGreaterThan(stateChangedGuard);
  });
});
