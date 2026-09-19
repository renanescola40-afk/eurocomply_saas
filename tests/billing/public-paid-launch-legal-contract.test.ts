import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  isEffectivePublicLegalVersion,
  isPublicSelfServeContractEffective,
  PUBLIC_CONTRACT_ACCEPTANCE_METHOD,
  PUBLIC_PRIVACY_VERSION,
  PUBLIC_TERMS_VERSION,
} from '@/lib/legal/public-contract';

const checkoutRoute = readFileSync(join(process.cwd(), 'src/app/api/billing/checkout/route.ts'), 'utf8');
const billingAction = readFileSync(
  join(process.cwd(), 'src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx'),
  'utf8',
);

describe('public paid launch legal contract gate', () => {
  it('keeps review and draft legal versions fail-closed', () => {
    expect(isEffectivePublicLegalVersion('1.0')).toBe(true);
    expect(isEffectivePublicLegalVersion('0.3-review')).toBe(false);
    expect(isEffectivePublicLegalVersion('draft')).toBe(false);
    expect(isEffectivePublicLegalVersion('pending-approval')).toBe(false);
    expect(PUBLIC_TERMS_VERSION).toBe('0.3-review');
    expect(PUBLIC_PRIVACY_VERSION).toBe('0.2-review');
    expect(isPublicSelfServeContractEffective()).toBe(false);
  });

  it('binds explicit clickwrap versions and method into the initial Stripe checkout evidence', () => {
    expect(PUBLIC_CONTRACT_ACCEPTANCE_METHOD).toBe('checkout_clickwrap_v1');
    expect(checkoutRoute).toContain('isPublicSelfServeContractEffective()');
    expect(checkoutRoute).toContain("error: 'legal_publication_not_effective'");
    expect(checkoutRoute).toContain("error: 'terms_acceptance_required'");
    expect(checkoutRoute).toContain('terms_version: PUBLIC_TERMS_VERSION');
    expect(checkoutRoute).toContain('privacy_version: PUBLIC_PRIVACY_VERSION');
    expect(checkoutRoute).toContain('legal_acceptance_method: PUBLIC_CONTRACT_ACCEPTANCE_METHOD');
    expect(checkoutRoute).toContain('legal_acceptance_at: legalAcceptanceAt');
  });

  it('requires a deliberate browser clickwrap before sending a checkout request', () => {
    expect(billingAction).toContain('type="checkbox"');
    expect(billingAction).toContain('checked={legalAccepted}');
    expect(billingAction).toContain("action === 'checkout' && !legalAccepted");
    expect(billingAction).toContain('legalAcceptance: legalAccepted');
    expect(billingAction).toContain('termsVersion: PUBLIC_TERMS_VERSION');
    expect(billingAction).toContain('privacyVersion: PUBLIC_PRIVACY_VERSION');
    expect(billingAction).toContain('method: PUBLIC_CONTRACT_ACCEPTANCE_METHOD');
    expect(billingAction).toContain('/terms');
    expect(billingAction).toContain('/privacy');
  });
});
