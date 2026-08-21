import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/risks.ts';
const migrationPath = 'supabase/migrations/20260822001000_atomic_vendor_risk_quota_mutations.sql';

describe('risk deletion audit persistence', () => {
  it('routes deletion through the atomic commercial mutation RPC', () => {
    const source = readFileSync(actionPath, 'utf8');
    const deleteSource = source.slice(source.indexOf('export async function deleteRisk'));

    expect(deleteSource).toContain('mutateCommercialResourceAtomic({');
    expect(deleteSource).toContain("resource: 'risk'");
    expect(deleteSource).toContain("operation: 'delete'");
    expect(deleteSource).not.toContain(".from('risks').delete");
  });

  it('makes risk deletion and both audit streams one database transaction', () => {
    const source = readFileSync(actionPath, 'utf8');
    const deleteSource = source.slice(source.indexOf('export async function deleteRisk'));
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain("p_operation = 'delete' and p_resource_type = 'risk'");
    expect(migration).toContain('delete from public.risks');
    expect(migration).toContain('insert into public.audit_logs');
    expect(migration).toContain('insert into public.audit_events');
    expect(deleteSource).not.toContain('const audit = await logAuditEvent');
    expect(deleteSource).not.toContain("supabase.from('risks').insert");
    expect(deleteSource).not.toContain('risk_delete_audit_rollback');
  });

  it('keeps deletion tenant-scoped and fails closed when no row is deleted', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('where id = p_entity_id');
    expect(migration).toContain('and organization_id = p_organization_id');
    expect(migration).toContain("return query select 'not_found_or_conflict'::text");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');
    const deleteSource = source.slice(source.indexOf('export async function deleteRisk'));

    expect(deleteSource).toContain("assertCurrentUserCan(payload.organizationId, user.id, 'risks:delete')");
    expect(source).toContain("policy: 'general-api'");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(deleteSource).toContain("action: 'delete'");
  });
});
