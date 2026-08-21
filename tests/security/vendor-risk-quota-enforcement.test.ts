import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const CATALOG = new URL('../../src/lib/billing/plans.ts', import.meta.url);
const ENTITLEMENTS = new URL('../../src/server/billing/entitlements.ts', import.meta.url);
const VENDORS = new URL('../../src/server/actions/vendors.ts', import.meta.url);
const RISKS = new URL('../../src/server/actions/risks.ts', import.meta.url);
const ATOMIC_CLIENT = new URL('../../src/server/actions/commercial-resource-atomic.ts', import.meta.url);
const ATOMIC_MIGRATION = new URL('../../supabase/migrations/20260822001000_atomic_vendor_risk_quota_mutations.sql', import.meta.url);
const RBAC = new URL('../../src/server/security/rbac.ts', import.meta.url);

describe('vendor and risk commercial quota boundary', () => {
  it('does not advertise vendor or risk capacity on Essential', async () => {
    const source = await readFile(CATALOG, 'utf8');
    const essential = source.slice(source.indexOf("id: 'starter'"), source.indexOf("id: 'professional'"));
    const professional = source.slice(source.indexOf("id: 'professional'"), source.indexOf("id: 'business'"));
    const business = source.slice(source.indexOf("id: 'business'"), source.indexOf("id: 'enterprise'"));

    expect(essential).toContain('vendors: 0, risks: 0');
    expect(professional).toContain('vendors: 30, risks: 75');
    expect(business).toContain('vendors: 150, risks: 300');
  });

  it('derives vendor and risk limits from canonical billing entitlements', async () => {
    const source = await readFile(ENTITLEMENTS, 'utf8');

    expect(source).toContain('maxVendors: number;');
    expect(source).toContain('maxRisks: number;');
    expect(source).toContain('maxVendors: unlimited ? Number.POSITIVE_INFINITY : canonicalLimits.vendors');
    expect(source).toContain('maxRisks: unlimited ? Number.POSITIVE_INFINITY : canonicalLimits.risks');
    expect(source).toContain('export async function assertResourceQuota');
    expect(source).toContain(".from(resource)");
    expect(source).toContain("count: 'exact'");
    expect(source).toContain('countResult.currentCount >= maxAllowed');
    expect(source).toContain("error: 'quota_unavailable'");
  });

  it('keeps the Professional RBAC floor for vendor and risk product surfaces', async () => {
    const source = await readFile(RBAC, 'utf8');
    const planMap = source.slice(
      source.indexOf('const MINIMUM_PLAN_BY_PERMISSION'),
      source.indexOf('function isSupabaseUserId'),
    );

    expect(planMap).toContain("manage_vendors: 'professional'");
    expect(planMap).toContain("read_vendors: 'professional'");
    expect(planMap).toContain("manage_risks: 'professional'");
    expect(planMap).toContain("read_risks: 'professional'");
  });

  it('routes vendor create/delete through the atomic commercial mutation authority', async () => {
    const source = await readFile(VENDORS, 'utf8');
    const create = source.slice(source.indexOf('export async function createVendor'), source.indexOf('export async function updateVendor'));
    const remove = source.slice(source.indexOf('export async function deleteVendor'));

    expect(create).toContain('const quota = await enforceVendorQuota(payload.organizationId);');
    expect(create).toContain('mutateCommercialResourceAtomic({');
    expect(create).toContain("resource: 'vendor'");
    expect(create).toContain("operation: 'create'");
    expect(create).toContain('maxCount: quota.maxAllowed');
    expect(create).not.toContain(".from('vendors').insert");
    expect(create).not.toContain('verifyResourceQuotaAfterCreate');

    expect(remove).toContain('mutateCommercialResourceAtomic({');
    expect(remove).toContain("resource: 'vendor'");
    expect(remove).toContain("operation: 'delete'");
    expect(remove).not.toContain(".from('vendors').delete");
    expect(remove).not.toContain("supabase.from('vendors').insert");
  });

  it('routes risk create/delete through the same atomic authority', async () => {
    const source = await readFile(RISKS, 'utf8');
    const create = source.slice(source.indexOf('export async function createRisk'), source.indexOf('export async function updateRisk'));
    const remove = source.slice(source.indexOf('export async function deleteRisk'));

    expect(create).toContain('const quota = await enforceRiskQuota(payload.organizationId);');
    expect(create).toContain('mutateCommercialResourceAtomic({');
    expect(create).toContain("resource: 'risk'");
    expect(create).toContain("operation: 'create'");
    expect(create).toContain('maxCount: quota.maxAllowed');
    expect(create).not.toContain(".from('risks').insert");
    expect(create).not.toContain('verifyResourceQuotaAfterCreate');

    expect(remove).toContain('mutateCommercialResourceAtomic({');
    expect(remove).toContain("resource: 'risk'");
    expect(remove).toContain("operation: 'delete'");
    expect(remove).not.toContain(".from('risks').delete");
    expect(remove).not.toContain("supabase.from('risks').insert");
  });

  it('serializes quota-changing writes and both audit streams in one database transaction', async () => {
    const sql = await readFile(ATOMIC_MIGRATION, 'utf8');

    expect(sql).toContain('mutate_commercial_resource_with_audit_atomic');
    expect(sql).toContain('pg_advisory_xact_lock(hashtext(p_organization_id::text))');
    expect(sql).toContain("from public.vendors\n    where organization_id = p_organization_id;");
    expect(sql).toContain("from public.risks\n    where organization_id = p_organization_id;");
    expect(sql).toContain('v_count >= p_max_count');
    expect(sql).toContain('insert into public.audit_logs');
    expect(sql).toContain('insert into public.audit_events');
    expect(sql).toContain("raise exception 'audit chain previous hash mismatch' using errcode = '40001'");
    expect(sql).toContain('grant execute on function public.mutate_commercial_resource_with_audit_atomic');
    expect(sql).toContain('to service_role;');
    expect(sql).not.toContain('alter table public.risks');
  });

  it('uses bounded audit-chain retry and the shared canonical server metadata builder', async () => {
    const source = await readFile(ATOMIC_CLIENT, 'utf8');

    expect(source).toContain("const ATOMIC_COMMERCIAL_RESOURCE_RPC = 'mutate_commercial_resource_with_audit_atomic'");
    expect(source).toContain('const MAX_ATOMIC_MUTATION_ATTEMPTS = 4;');
    expect(source).toContain('buildServerAuditMetadata(input.auditMetadata)');
    expect(source).toContain("error.code === '40001'");
    expect(source).toContain('attempt < MAX_ATOMIC_MUTATION_ATTEMPTS');
    expect(source).not.toContain('ALLOW_NON_TRANSACTIONAL');
  });
});
