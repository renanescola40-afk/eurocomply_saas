import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/actions/risks.ts', 'utf8');
const updateStart = source.indexOf('export async function updateRisk');
const deleteStart = source.indexOf('export async function deleteRisk');
const updateSource = source.slice(updateStart, deleteStart);

describe('risk update server-action boundary', () => {
  it('requires bounded input, tenant authorization and fail-closed throttling', () => {
    expect(updateSource).toContain('const payload = updateRiskSchema.parse(input)');
    expect(updateSource).toContain("assertCurrentUserCan(payload.organizationId, user.id, 'risks:write')");
    expect(updateSource).toContain("action: 'update'");
    expect(source).toContain("failureMode: 'fail-closed'");
  });

  it('uses tenant scope and optimistic concurrency for reads and writes', () => {
    expect(updateSource).toContain(".eq('id', payload.riskId)");
    expect(updateSource).toContain(".eq('organization_id', payload.organizationId)");
    expect(updateSource).toContain(".eq('updated_at', payload.expectedUpdatedAt)");
    expect(updateSource).toContain("throw actionError('Risk changed or no longer exists')");
  });

  it('uses explicit mutation selects and never returns every database column', () => {
    expect(source).toContain('const RISK_MUTATION_SELECT =');
    expect(updateSource).toContain('.select(RISK_MUTATION_SELECT)');
    expect(source).not.toContain(".select('*')");
  });

  it('requires durable audit evidence and compensates the exact updated row', () => {
    expect(updateSource).toContain("action: 'risk.update'");
    expect(updateSource).toContain('if (!audit.persisted)');
    expect(updateSource).toContain("area: 'risk_update_audit_rollback'");
    expect(updateSource).toContain(".eq('updated_at', data.updated_at)");
    expect(updateSource).toContain('updated_at: previous.updated_at');

    const auditGuard = updateSource.indexOf('if (!audit.persisted)');
    const success = updateSource.indexOf('return data;', auditGuard);
    expect(auditGuard).toBeGreaterThan(-1);
    expect(success).toBeGreaterThan(auditGuard);
  });
});
