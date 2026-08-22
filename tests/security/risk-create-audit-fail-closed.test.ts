import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/risks.ts';
const atomicHelperPath = 'src/server/billing/commercial-resource-atomic.ts';
const migrationPath = 'supabase/migrations/20260822120617_atomic_vendor_risk_quota_mutations.sql';
const source = readFileSync(actionPath, 'utf8');
const createSource = source.slice(source.indexOf('export async function createRisk'), source.indexOf('export async function updateRisk'));
const atomicHelper = readFileSync(atomicHelperPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');

describe('risk creation audit persistence', () => {
  it('routes creation through the atomic quota and audit authority', () => {
    expect(createSource).toContain('mutateCommercialResourceAtomic({');
    expect(createSource).toContain("resource: 'risk'");
    expect(createSource).toContain("operation: 'create'");
    expect(createSource).toContain('maxCount: quota.maxAllowed');
    expect(createSource).toContain('return result.resource_record;');
    expect(createSource).not.toContain('logAuditEvent({');
    expect(createSource).not.toContain(".from('risks').insert");
  });

  it('commits the risk and both audit streams in one database transaction', () => {
    expect(migration).toContain("p_operation = 'create' and p_resource_type = 'risk'");
    expect(migration).toContain('insert into public.risks');
    expect(migration).toContain('insert into public.audit_logs');
    expect(migration).toContain('insert into public.audit_events');
    expect(createSource).not.toContain('risk_create_audit_rollback');
    expect(createSource).not.toContain(".from('risks').delete");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    expect(source).toContain("await assertCurrentUserCan(payload.organizationId, user.id, 'risks:write')");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(createSource).toContain("action: 'create'");
    expect(atomicHelper).toContain('action: `${input.resource}.${input.operation}`');
  });
});
