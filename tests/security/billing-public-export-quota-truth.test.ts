import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicCatalog = readFileSync('src/app/api/billing/catalog/route.ts', 'utf8');
const serverCatalog = readFileSync('src/server/billing/plans.ts', 'utf8');

describe('public billing export quota truth', () => {
  it('keeps export-count capacity internal until monthly usage authority exists', () => {
    expect(serverCatalog).toContain("exports: number | 'unlimited'");
    expect(publicCatalog).toContain('getPublicPlanEntitlements(plan)');
    expect(publicCatalog).not.toContain('entitlements: plan.entitlements');
    expect(publicCatalog).not.toContain('exports: plan.entitlements.exports');
  });

  it('continues publishing currently enforced plan facts', () => {
    expect(publicCatalog).toContain('users: plan.entitlements.users');
    expect(publicCatalog).toContain('documents: plan.entitlements.documents');
    expect(publicCatalog).toContain('auditLogsDays: plan.entitlements.auditLogsDays');
    expect(publicCatalog).toContain('vendorRisk: plan.entitlements.vendorRisk');
  });
});
