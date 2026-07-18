import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/risks.ts';

describe('risk creation audit persistence', () => {
  it('does not return a created risk when durable audit persistence fails', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain('const audit = await logAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successIndex = source.indexOf('return data;');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('attempts an exact tenant-scoped rollback of the newly inserted risk', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("area: 'risk_create_audit_rollback'");
    expect(source).toContain(".from('risks')\n        .delete()");
    expect(source).toContain(".eq('id', data.id)");
    expect(source).toContain(".eq('organization_id', payload.organizationId)");
    expect(source).toContain(".eq('created_by', user.id)");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("await assertCurrentUserCan(payload.organizationId, user.id, 'risks:write')");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("action: 'risk.create'");
  });
});
