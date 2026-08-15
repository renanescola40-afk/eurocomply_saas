import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveStripeBillingPortalConfigurationBinding } from './portal-configuration';

const schema = 'risck-comply.stripe-billing-portal-contract.v1';
const source = readFileSync('src/server/billing/portal-configuration.ts', 'utf8');
const currentContract = JSON.parse(readFileSync('config/stripe-billing-portal-contract.json', 'utf8')) as {
  schema: string;
  configurationId: string | null;
};

describe('Stripe Billing Portal configuration authority', () => {
  it('keeps the current reviewed contract on account-default mode', () => {
    expect(currentContract).toEqual({ schema, configurationId: null });
    expect(resolveStripeBillingPortalConfigurationBinding()).toEqual({
      ok: true,
      configurationId: null,
      source: 'default',
    });
  });

  it('accepts a reviewed explicit bpc configuration identifier', () => {
    expect(resolveStripeBillingPortalConfigurationBinding({
      schema,
      configurationId: 'bpc_livefixture123',
    })).toEqual({
      ok: true,
      configurationId: 'bpc_livefixture123',
      source: 'explicit',
    });
  });

  it('fails closed for an invalid contract schema', () => {
    expect(resolveStripeBillingPortalConfigurationBinding({
      schema: 'unexpected.schema',
      configurationId: null,
    })).toEqual({ ok: false, error: 'billing_portal_configuration_invalid' });
  });

  it.each(['not-a-bpc', 'bpc_bad-value', '', 42])('fails closed for malformed configuration id %j', (configurationId) => {
    expect(resolveStripeBillingPortalConfigurationBinding({
      schema,
      configurationId,
    })).toEqual({ ok: false, error: 'billing_portal_configuration_invalid' });
  });

  it('does not permit an environment variable to override the versioned authority', () => {
    expect(source).not.toContain('process.env');
    expect(source).not.toContain('STRIPE_BILLING_PORTAL_CONFIGURATION_ID');
    expect(source).toContain("../../../config/stripe-billing-portal-contract.json");
  });
});
