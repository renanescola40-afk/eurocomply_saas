import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/risks.ts';

describe('risk deletion audit persistence', () => {
  it('requires durable audit evidence before returning deletion success', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("action: 'risk.delete'");
    expect(source).toContain('const audit = await logAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successIndex = source.indexOf('return data;', auditGuardIndex);

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('captures and restores the exact tenant-scoped row when auditing fails', () => {
    const source = readFileSync(actionPath, 'utf8');
    const deleteStart = source.indexOf('export async function deleteRisk');
    const deleteSource = source.slice(deleteStart);

    expect(deleteSource).toContain(".from('risks')");
    expect(deleteSource).toContain('.delete()');
    expect(deleteSource).toContain(".eq('id', payload.riskId)");
    expect(deleteSource).toContain(".eq('organization_id', payload.organizationId)");
    expect(deleteSource).toContain(".select('*')");
    expect(deleteSource).toContain("await supabase.from('risks').insert(data)");
    expect(deleteSource).toContain("area: 'risk_delete_audit_rollback'");
    expect(deleteSource).toContain("throw actionError('Unable to delete risk')");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');
    const deleteStart = source.indexOf('export async function deleteRisk');
    const deleteSource = source.slice(deleteStart);

    expect(deleteSource).toContain("assertCurrentUserCan(payload.organizationId, user.id, 'risks:delete')");
    expect(deleteSource).toContain("policy: 'general-api'");
    expect(deleteSource).toContain("failureMode: 'fail-closed'");
    expect(deleteSource).toContain('organizationId: payload.organizationId');
  });
});
