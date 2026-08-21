import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const CATALOG = new URL('../../src/lib/billing/plans.ts', import.meta.url);
const ENTITLEMENTS = new URL('../../src/server/billing/entitlements.ts', import.meta.url);
const VENDORS = new URL('../../src/server/actions/vendors.ts', import.meta.url);
const RISKS = new URL('../../src/server/actions/risks.ts', import.meta.url);
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
    expect(source).toContain('export async function verifyResourceQuotaAfterCreate');
    expect(source).toContain(".from(resource)");
    expect(source).toContain('count: \'exact\'');
    expect(source).toContain('countResult.currentCount >= maxAllowed');
    expect(source).toContain('countResult.currentCount > maxAllowed');
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

  it('enforces vendor quota before insert and compensates a failed post-check', async () => {
    const source = await readFile(VENDORS, 'utf8');
    const create = source.slice(source.indexOf('export async function createVendor'), source.indexOf('export async function updateVendor'));

    expect(create).toContain('const quota = await enforceVendorQuota(payload.organizationId);');
    expect(create).toContain("verifyResourceQuotaAfterCreate(payload.organizationId, 'vendors', quota.maxAllowed)");
    expect(create).toContain("area: 'vendor_create_quota_postcheck'");
    expect(create).toContain(".from('vendors')");
    expect(create).toContain(".eq('created_by', user.id)");
    expect(create.indexOf('const quota = await enforceVendorQuota')).toBeLessThan(create.indexOf(".from('vendors').insert"));
    expect(create.indexOf('verifyResourceQuotaAfterCreate')).toBeLessThan(create.indexOf('const audit = await logAuditEvent'));
  });

  it('enforces risk quota before insert and compensates a failed post-check', async () => {
    const source = await readFile(RISKS, 'utf8');
    const create = source.slice(source.indexOf('export async function createRisk'), source.indexOf('export async function updateRisk'));

    expect(create).toContain('const quota = await enforceRiskQuota(payload.organizationId);');
    expect(create).toContain("verifyResourceQuotaAfterCreate(payload.organizationId, 'risks', quota.maxAllowed)");
    expect(create).toContain("area: 'risk_create_quota_postcheck'");
    expect(create).toContain(".from('risks')");
    expect(create).toContain(".eq('created_by', user.id)");
    expect(create.indexOf('const quota = await enforceRiskQuota')).toBeLessThan(create.indexOf(".from('risks')"));
    expect(create.indexOf('verifyResourceQuotaAfterCreate')).toBeLessThan(create.indexOf('const audit = await logAuditEvent'));
  });
});
