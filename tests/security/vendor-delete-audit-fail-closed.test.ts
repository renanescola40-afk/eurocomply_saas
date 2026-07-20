import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/actions/vendors.ts', 'utf8');
const deleteVendorSource = source.slice(source.indexOf('export async function deleteVendor'));

describe('vendor deletion audit persistence boundary', () => {
  it('captures the complete allowlisted deleted row for exact compensation', () => {
    expect(deleteVendorSource).toContain(".eq('organization_id', payload.organizationId)");
    expect(deleteVendorSource).toContain('.select(vendorColumns)');
    expect(deleteVendorSource).not.toContain(".select('*')");
  });

  it('fails closed when the deletion audit cannot be persisted', () => {
    expect(deleteVendorSource).toContain('const audit = await logAuditEvent');
    expect(deleteVendorSource).toContain("action: 'vendor.delete'");
    expect(deleteVendorSource).toContain('if (!audit.persisted)');
    expect(deleteVendorSource).toContain("throw providerActionError('Não foi possível remover o fornecedor agora.')");
  });

  it('attempts to restore the exact deleted vendor row and sanitizes rollback reporting', () => {
    expect(deleteVendorSource).toContain("supabase.from('vendors').insert(data)");
    expect(deleteVendorSource).toContain("new Error('vendor_delete_audit_compensation_failed')");
    expect(deleteVendorSource).toContain("providerCode: rollbackError.code ?? 'unknown'");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    expect(deleteVendorSource).toContain("assertCurrentUserCan(payload.organizationId, user.id, 'vendors:delete')");
    expect(deleteVendorSource).toContain("enforceVendorActionRateLimit({ action: 'vendor.delete'");
    expect(source).toContain("failureMode: 'fail-closed'");
  });
});
