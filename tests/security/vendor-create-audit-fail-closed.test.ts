import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/vendors.ts';

describe('vendor creation audit persistence', () => {
  it('requires durable audit persistence before returning the created vendor', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain('const audit = await logAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successReturnIndex = source.indexOf('return data;', auditGuardIndex);

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successReturnIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('attempts an exact tenant-scoped compensation delete', () => {
    const source = readFileSync(actionPath, 'utf8');
    const compensationStart = source.indexOf('if (!audit.persisted)');
    const compensation = source.slice(compensationStart, source.indexOf('return data;', compensationStart));

    expect(compensation).toContain(".from('vendors')");
    expect(compensation).toContain('.delete()');
    expect(compensation).toContain(".eq('id', data.id)");
    expect(compensation).toContain(".eq('organization_id', payload.organizationId)");
    expect(compensation).toContain('vendor_create_audit_compensation_failed');
    expect(compensation).toContain("throw providerActionError('Não foi possível criar o fornecedor agora.');");
  });

  it('preserves authentication, tenant authorization, validation, and fail-closed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain('const user = await requireCurrentUser();');
    expect(source).toContain('const payload = vendorSchema.parse(input);');
    expect(source).toContain("await assertCurrentUserCan(payload.organizationId, user.id, 'vendors:write');");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain(".eq('organization_id', payload.organizationId)");
  });
});
