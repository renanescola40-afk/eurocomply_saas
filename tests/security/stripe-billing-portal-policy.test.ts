// @ts-nocheck
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildStripeBillingPortalCreateBody,
  findManagedStripeBillingPortalConfigurations,
  stripeBillingPortalConfigurationMatchesPolicy,
  validateStripeBillingPortalPolicy,
} from '../../scripts/security/stripe-billing-portal-policy.mjs';

const policy = JSON.parse(readFileSync('config/stripe-billing-portal-policy.json', 'utf8'));

function matchingConfiguration(overrides = {}) {
  return {
    id: 'bpc_fixture123',
    active: true,
    livemode: true,
    default_return_url: policy.defaultReturnUrl,
    metadata: { ...policy.managementMetadata },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['tax_id', 'address'],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
    ...overrides,
  };
}

describe('Stripe Billing Portal feature policy', () => {
  it('accepts the reviewed policy and keeps subscription lifecycle application-controlled', () => {
    const validated = validateStripeBillingPortalPolicy(policy);

    expect(validated.defaultReturnUrl).toBe('https://www.risckcomply.com/pt/dashboard/organizations/billing');
    expect(validated.features.customerUpdate.allowedUpdates).toEqual(['address', 'tax_id']);
    expect(validated.features.invoiceHistory.enabled).toBe(true);
    expect(validated.features.paymentMethodUpdate.enabled).toBe(true);
    expect(validated.features.subscriptionCancel.enabled).toBe(false);
    expect(validated.features.subscriptionUpdate.enabled).toBe(false);
  });

  it('builds the exact safe Stripe form without enabling direct subscription mutation', () => {
    const body = buildStripeBillingPortalCreateBody(policy);

    expect(body.get('default_return_url')).toBe(policy.defaultReturnUrl);
    expect(body.getAll('features[customer_update][allowed_updates][]').sort()).toEqual(['address', 'tax_id']);
    expect(body.get('features[invoice_history][enabled]')).toBe('true');
    expect(body.get('features[payment_method_update][enabled]')).toBe('true');
    expect(body.get('features[subscription_cancel][enabled]')).toBe('false');
    expect(body.get('features[subscription_update][enabled]')).toBe('false');
    expect(body.get('metadata[risck_comply_managed_by]')).toBe('protected-portal-bootstrap-v1');
  });

  it('matches provider feature order independently and can require managed metadata', () => {
    const configuration = matchingConfiguration();

    expect(stripeBillingPortalConfigurationMatchesPolicy(configuration, policy)).toBe(true);
    expect(stripeBillingPortalConfigurationMatchesPolicy(configuration, policy, { requireManagementMetadata: true })).toBe(true);
    expect(
      stripeBillingPortalConfigurationMatchesPolicy(
        { ...configuration, metadata: {} },
        policy,
        { requireManagementMetadata: true },
      ),
    ).toBe(false);
  });

  it('finds only active configurations created under the reviewed management marker', () => {
    const managed = matchingConfiguration();
    const inactive = matchingConfiguration({ id: 'bpc_inactive', active: false });
    const foreign = matchingConfiguration({ id: 'bpc_foreign', metadata: {} });

    expect(findManagedStripeBillingPortalConfigurations([managed, inactive, foreign], policy)).toEqual([managed]);
  });

  it('fails closed if policy attempts to bypass the application subscription lifecycle', () => {
    const unsafe = structuredClone(policy);
    unsafe.features.subscriptionCancel.enabled = true;

    expect(() => validateStripeBillingPortalPolicy(unsafe)).toThrow(
      'Stripe Billing Portal subscription lifecycle must remain application-controlled',
    );
  });

  it('fails closed for non-canonical return hosts and unsupported customer update fields', () => {
    const externalReturn = structuredClone(policy);
    externalReturn.defaultReturnUrl = 'https://example.com/billing';
    expect(() => validateStripeBillingPortalPolicy(externalReturn)).toThrow(
      'Stripe Billing Portal return URL must use the canonical production host',
    );

    const unsafeField = structuredClone(policy);
    unsafeField.features.customerUpdate.allowedUpdates.push('metadata');
    expect(() => validateStripeBillingPortalPolicy(unsafeField)).toThrow(
      'Invalid Stripe Billing Portal customer-update fields',
    );
  });
});
