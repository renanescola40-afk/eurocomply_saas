import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/vendors.ts';
const migrationPath = 'supabase/migrations/20260822120617_atomic_vendor_risk_quota_mutations.sql';
const source = readFileSync(actionPath, 'utf8');
const createSource = source.slice(source.indexOf('export async function createVendor'), source.indexOf('export async function updateVendor'));
const migration = readFileSync(migrationPath, 'utf8');

describe('vendor creation audit persistence', () => {
  it('routes creation through the atomic quota and audit authority', () => {
    expect(createSource).toContain('mutateCommercialResourceAtomic({');
    expect(createSource).toContain("resource: 'vendor'");
    expect(createSource).toContain("operation: 'create'");
    expect(createSource).toContain('maxCount: quota.maxAllowed');
    expect(createSource).toContain('return result.resource_record;');
    expect(createSource).not.toContain('logAuditEvent({');
    expect(createSource).not.toContain(".from('vendors').insert");
  });

  it('commits the vendor and both audit streams in one database transaction', () => {
    expect(migration).toContain("p_operation = 'create' and p_resource_type = 'vendor'");
    expect(migration).toContain('insert into public.vendors');
    expect(migration).toContain('insert into public.audit_logs');
    expect(migration).toContain('insert into public.audit_events');
    expect(createSource).not.toContain('vendor_create_audit_compensation_failed');
    expect(createSource).not.toContain(".from('vendors').delete");
  });

  it('preserves authentication, tenant authorization, validation, and fail-closed rate limiting', () => {
    expect(source).toContain('const user = await requireCurrentUser();');
    expect(source).toContain('const payload = vendorSchema.parse(input);');
    expect(source).toContain("await assertCurrentUserCan(payload.organizationId, user.id, 'vendors:write');");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(createSource).toContain('organizationId: payload.organizationId');
  });
});
