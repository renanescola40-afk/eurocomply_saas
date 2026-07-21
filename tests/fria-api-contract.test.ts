import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-governance/fria/route.ts', 'utf8');
const queries = readFileSync('src/server/queries/fria.ts', 'utf8');
const page = readFileSync('src/app/[locale]/dashboard/fria/page.tsx', 'utf8');
const controlTower = readFileSync('src/server/ai-governance/regulatory-control-tower.ts', 'utf8');

describe('FRIA operational API contract', () => {
  it('enforces auth, tenant context and explicit read/manage permissions', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("permission: 'read_ai_governance'");
    expect(route).toContain("permission: 'manage_ai_governance'");
    expect(route).toContain('permissionDeniedResponse(permission)');
  });

  it('protects mutations with origin, bounded Zod parsing and fail-closed rate limiting', () => {
    expect(route).toContain('assertTrustedOrigin(request)');
    expect(route).toContain('MAX_BYTES = 96 * 1024');
    expect(route).toContain('parseJsonBodyWithZod(request');
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('security_control_unavailable');
  });

  it('re-evaluates approval server-side and compensates audit failure', () => {
    expect(route).toContain('decideFria({');
    expect(route).toContain('fria_approval_requirements_not_met');
    expect(route).toContain('restoreFriaAssessment(before)');
    expect(route).toContain("rollbackFriaCreate('ai_fria_assessments'");
    expect(route).toContain("rollbackFriaCreate('ai_fria_evidence'");
    expect(route).toContain('fria_audit_unavailable');
  });

  it('scopes every database operation by organization', () => {
    expect(queries.match(/\.eq\('organization_id'/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(route).toContain("body.storageReference.startsWith(`${organization.id}/`)");
    expect(route).not.toContain('error.message');
  });

  it('exposes the localized workspace from the control tower', () => {
    expect(page).toContain("fetch('/api/ai-governance/fria'");
    expect(page).toContain("workflow=${workflow}");
    expect(page).toContain('FRIA Workspace');
    expect(controlTower).toContain("route:'/dashboard/fria'");
  });
});
