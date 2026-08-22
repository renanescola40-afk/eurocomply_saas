import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/actions/vendors.ts', 'utf8');
const deleteVendorSource = source.slice(source.indexOf('export async function deleteVendor'));
const migration = readFileSync('supabase/migrations/20260822120617_atomic_vendor_risk_quota_mutations.sql', 'utf8');

describe('vendor deletion audit persistence boundary', () => {
  it('routes deletion through the atomic commercial mutation RPC', () => {
    expect(deleteVendorSource).toContain('mutateCommercialResourceAtomic({');
    expect(deleteVendorSource).toContain("resource: 'vendor'");
    expect(deleteVendorSource).toContain("operation: 'delete'");
    expect(deleteVendorSource).toContain('expectedReviewVersion: payload.expectedReviewVersion');
    expect(deleteVendorSource).not.toContain(".from('vendors').delete");
  });

  it('persists delete and audit in the same transaction instead of compensating afterward', () => {
    expect(migration).toContain("p_operation = 'delete' and p_resource_type = 'vendor'");
    expect(migration).toContain('delete from public.vendors');
    expect(migration).toContain('insert into public.audit_logs');
    expect(migration).toContain('insert into public.audit_events');
    expect(deleteVendorSource).not.toContain('const audit = await logAuditEvent');
    expect(deleteVendorSource).not.toContain("supabase.from('vendors').insert");
    expect(deleteVendorSource).not.toContain('vendor_delete_audit_compensation_failed');
  });

  it('keeps tenant scope and optimistic review-version protection inside the RPC', () => {
    expect(migration).toContain('and organization_id = p_organization_id');
    expect(migration).toContain('(p_expected_review_version is null or review_version = p_expected_review_version)');
    expect(migration).toContain("return query select 'not_found_or_conflict'::text");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    expect(deleteVendorSource).toContain("assertCurrentUserCan(payload.organizationId, user.id, 'vendors:delete')");
    expect(deleteVendorSource).toContain("enforceVendorActionRateLimit({ action: 'vendor.delete'");
    expect(source).toContain("failureMode: 'fail-closed'");
  });
});
