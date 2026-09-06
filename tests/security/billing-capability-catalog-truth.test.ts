import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { canAccessFeature, getPlanLimit } from '@/lib/billing/feature-gates';
import { getBillingPlan } from '@/lib/billing/plans';

const apiCredentialMigration = readFileSync(
  'supabase/migrations/20260721216000_enterprise_api_key_provisioning.sql',
  'utf8',
);
const reconciliation = readFileSync(
  'supabase/migrations/20260906004500_billing_entitlement_catalog_truth.sql',
  'utf8',
);

describe('billing capability catalog truth', () => {
  it('does not sell machine API or webhook authority to plans that cannot provision it', () => {
    expect(apiCredentialMigration).toContain("actor.role in ('owner','platform_owner','platform_admin','platform_security')");
    expect(apiCredentialMigration).toContain("v_snapshot.contract_status is distinct from 'active'");
    expect(apiCredentialMigration).toContain("v_snapshot.api_enabled is distinct from true");

    expect(canAccessFeature('api', { plan: 'professional' })).toBe(false);
    expect(canAccessFeature('api', { plan: 'business' })).toBe(false);
    expect(canAccessFeature('api', { plan: 'enterprise' })).toBe(true);
    expect(canAccessFeature('webhooks', { plan: 'professional' })).toBe(false);
    expect(canAccessFeature('webhooks', { plan: 'enterprise' })).toBe(true);

    expect(getBillingPlan('professional')?.features).not.toContain('API');
    expect(getBillingPlan('professional')?.features).not.toContain('Webhooks');
    expect(getBillingPlan('enterprise')?.features).toContain('API');
    expect(getBillingPlan('enterprise')?.features).toContain('Webhooks');
  });

  it('keeps one organization per non-Enterprise commercial authority until billing accounts exist', () => {
    expect(getPlanLimit('starter', 'organizations')).toBe(1);
    expect(getPlanLimit('professional', 'organizations')).toBe(1);
    expect(getPlanLimit('business', 'organizations')).toBe(1);
    expect(reconciliation).toContain("else '1'::jsonb");
  });

  it('reconciles stale lower-plan API/webhook entitlement JSON to zero', () => {
    expect(reconciliation).toContain("'{apiRequestsMonthly}'");
    expect(reconciliation).toContain("'{webhooks}'");
    expect(reconciliation).toContain("else '0'::jsonb");
    expect(getPlanLimit('professional', 'apiRequestsMonthly')).toBe(0);
    expect(getPlanLimit('business', 'webhooks')).toBe(0);
  });
});
