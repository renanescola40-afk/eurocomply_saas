import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const historicalBoundary = readFileSync(
  'supabase/migrations/20260721214260_enterprise_billing_binding_hardening.sql',
  'utf8',
);
const v19Boundary = readFileSync(
  'supabase/migrations/20260822123600_v19_finalize_enterprise_contract_mode_compatibility.sql',
  'utf8',
);
const billing = readFileSync('src/server/enterprise/billing.ts', 'utf8');
const selfServiceCheckout = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');

describe('Enterprise Stripe binding boundary', () => {
  it('preserves the reviewed explicit-contract-or-existing-subscription selector in V19', () => {
    for (const migration of [historicalBoundary, v19Boundary]) {
      expect(migration).toContain('p_contract_id is not null');
      expect(migration).toContain('p_stripe_subscription_id is not null');
    }
    expect(historicalBoundary).toContain("contract.contract_mode = 'negotiated'");
    expect(historicalBoundary).toContain('contract.id = p_contract_id');
    expect(historicalBoundary).toContain('contract.stripe_subscription_id = p_stripe_subscription_id');
    expect(v19Boundary).toContain("contract.contract_mode='negotiated'");
    expect(v19Boundary).toContain('contract.id=p_contract_id');
    expect(v19Boundary).toContain('contract.stripe_subscription_id=p_stripe_subscription_id');
  });

  it('does not use organization-only matching for a new Stripe binding', () => {
    const historicalSelection = historicalBoundary.slice(
      historicalBoundary.indexOf('select contract.* into v_contract'),
      historicalBoundary.indexOf("return query select 'not_enterprise'::text"),
    );
    const v3Start = v19Boundary.indexOf(
      'create or replace function public.sync_enterprise_contract_billing_v3_atomic',
    );
    const configureStart = v19Boundary.indexOf(
      'create or replace function public.configure_enterprise_contract_billing_v2_atomic',
    );
    const v19Selection = v19Boundary.slice(v3Start, configureStart);

    expect(historicalSelection).not.toContain('contract.organization_id = p_organization_id\n        and contract.status');
    expect(historicalSelection).not.toContain('contract.stripe_customer_id is null');
    expect(v19Selection).not.toContain(
      "p_organization_id is not null\n        and contract.organization_id=p_organization_id",
    );
    expect(v19Selection).not.toContain('contract.stripe_customer_id is null');
  });

  it('passes Enterprise metadata and modern Invoice subscription references to the v3 RPC', () => {
    expect(billing).toContain('metadataValueFromEventObject(');
    expect(billing).toContain("'enterprise_contract_id'");
    expect(billing).toContain("'organization_id'");
    expect(billing).toContain('parent?.subscription_details?.metadata');
    expect(billing).toContain('parent?.subscription_details?.subscription');
    expect(billing).toContain("'sync_enterprise_contract_billing_v3_atomic'");
  });

  it('permits pre-V19 fallthrough only for the canonical self-service billing_flow marker', () => {
    expect(selfServiceCheckout).toContain("billing_flow: 'initial_subscription'");
    expect(selfServiceCheckout).toContain('subscription_data: { metadata }');
    expect(billing).toContain("metadataValueFromEventObject(object, 'billing_flow')");
    expect(billing).toContain("billingFlow === 'initial_subscription'");
    expect(billing).toContain('&& isKnownSelfServiceEvent');
  });

  it('keeps duplicate Enterprise events idempotent before new binding selection', () => {
    for (const migration of [historicalBoundary, v19Boundary]) {
      expect(migration).toContain('stripe_event_id');
      expect(migration).toContain("'duplicate'::text");
    }

    const v3Start = v19Boundary.indexOf(
      'create or replace function public.sync_enterprise_contract_billing_v3_atomic',
    );
    const configureStart = v19Boundary.indexOf(
      'create or replace function public.configure_enterprise_contract_billing_v2_atomic',
    );
    const v3Definition = v19Boundary.slice(v3Start, configureStart);
    expect(v3Definition.indexOf('where event.stripe_event_id=p_event_id')).toBeLessThan(
      v3Definition.indexOf("where contract.contract_mode='negotiated'", v3Definition.indexOf('if found then') + 1),
    );
  });
});
