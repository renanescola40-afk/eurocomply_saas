import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/actions/vendors.ts', 'utf8');
const updateStart = source.indexOf('export async function updateVendor');
const deleteStart = source.indexOf('export async function deleteVendor');
const updateSource = source.slice(updateStart, deleteStart);

describe('vendor update audit persistence', () => {
  it('captures the prior tenant-scoped row before mutation using the explicit allowlist', () => {
    expect(updateSource).toContain('const { data: previous, error: previousError }');
    expect(updateSource).toContain(".from('vendors')");
    expect(updateSource).toContain('.select(vendorColumns)');
    expect(updateSource).not.toContain(".select('*')");
    expect(updateSource).toContain(".eq('id', payload.vendorId)");
    expect(updateSource).toContain(".eq('organization_id', payload.organizationId)");
  });

  it('requires durable audit persistence before returning update success', () => {
    expect(updateSource).toContain('const audit = await logAuditEvent({');
    expect(updateSource).toContain("action: 'vendor.update'");
    expect(updateSource).toContain('if (!audit.persisted)');

    const guardIndex = updateSource.indexOf('if (!audit.persisted)');
    const successIndex = updateSource.indexOf('return data;', guardIndex);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(successIndex).toBeGreaterThan(guardIndex);
  });

  it('attempts tenant-scoped optimistic compensation and sanitizes reporting', () => {
    expect(updateSource).toContain('.update(previous)');
    expect(updateSource).toContain(".eq('name', data.name)");
    expect(updateSource).toContain(".eq('risk_level', data.risk_level)");
    expect(updateSource).toContain(".eq('review_status', data.review_status)");
    expect(updateSource).toContain("new Error('vendor_update_audit_compensation_failed')");
    expect(updateSource).toContain("providerCode: rollbackError.code ?? 'unknown'");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    expect(updateSource).toContain("assertCurrentUserCan(payload.organizationId, user.id, 'vendors:write')");
    expect(updateSource).toContain("enforceVendorActionRateLimit({ action: 'vendor.update'");
    expect(source).toContain("failureMode: 'fail-closed'");
  });
});
