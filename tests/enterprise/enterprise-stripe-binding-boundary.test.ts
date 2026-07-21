import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260721214260_enterprise_billing_binding_hardening.sql',
  'utf8',
);
const billing = readFileSync('src/server/enterprise/billing.ts', 'utf8');

describe('Enterprise Stripe binding boundary', () => {
  it('matches negotiated contracts only by explicit contract or existing subscription binding', () => {
    expect(migration).toContain("contract.contract_mode = 'negotiated'");
    expect(migration).toContain('p_contract_id is not null');
    expect(migration).toContain('contract.id = p_contract_id');
    expect(migration).toContain('p_stripe_subscription_id is not null');
    expect(migration).toContain('contract.stripe_subscription_id = p_stripe_subscription_id');
  });

  it('does not use organization-only matching for a new Stripe binding', () => {
    const selection = migration.slice(
      migration.indexOf('select contract.* into v_contract'),
      migration.indexOf("return query select 'not_enterprise'::text"),
    );
    expect(selection).not.toContain('contract.organization_id = p_organization_id\n        and contract.status');
    expect(selection).not.toContain('contract.stripe_customer_id is null');
  });

  it('accepts only UUID metadata before invoking the negotiated RPC', () => {
    expect(billing).toContain("metadataUuid(metadata, 'enterprise_contract_id'");
    expect(billing).toContain("metadataUuid(metadata, 'organization_id'");
    expect(billing).toContain("'sync_enterprise_contract_billing_v3_atomic'");
  });

  it('keeps duplicate Enterprise events idempotent even after lifecycle changes', () => {
    expect(migration).toContain('where event.stripe_event_id = p_event_id');
    expect(migration).toContain("'duplicate'::text");
    expect(migration.indexOf('where event.stripe_event_id = p_event_id')).toBeLessThan(
      migration.indexOf('select contract.* into v_contract', migration.indexOf('if found then') + 1),
    );
  });
});
