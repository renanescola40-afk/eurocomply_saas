import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  isEffectivePublicLegalPublication,
  isPublicSelfServeContractEffective,
  PUBLIC_CONTRACT_ACCEPTANCE_METHOD,
  PUBLIC_PRIVACY_PUBLICATION,
  PUBLIC_PRIVACY_VERSION,
  PUBLIC_TERMS_PUBLICATION,
  PUBLIC_TERMS_VERSION,
} from '@/lib/legal/public-contract';

const checkoutRoute = readFileSync(join(process.cwd(), 'src/app/api/billing/checkout/route.ts'), 'utf8');
const billingAction = readFileSync(
  join(process.cwd(), 'src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx'),
  'utf8',
);
const checkoutPage = readFileSync(join(process.cwd(), 'src/app/[locale]/checkout/page.tsx'), 'utf8');
const termsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/terms/page.tsx'), 'utf8');
const privacyPage = readFileSync(join(process.cwd(), 'src/app/[locale]/privacy/page.tsx'), 'utf8');
const signupPage = readFileSync(join(process.cwd(), 'src/app/[locale]/signup/page.tsx'), 'utf8');

describe('public paid launch legal contract gate', () => {
  it('keeps review publications fail-closed from the canonical publication records', () => {
    expect(isEffectivePublicLegalPublication({ version: '1.0', state: 'effective', effectiveDate: '2026-09-19' })).toBe(true);
    expect(isEffectivePublicLegalPublication({ version: '1.0', state: 'review', effectiveDate: null })).toBe(false);
    expect(PUBLIC_TERMS_PUBLICATION.state).toBe('review');
    expect(PUBLIC_PRIVACY_PUBLICATION.state).toBe('review');
    expect(PUBLIC_TERMS_VERSION).toBe('0.3-review');
    expect(PUBLIC_PRIVACY_VERSION).toBe('0.2-review');
    expect(isPublicSelfServeContractEffective()).toBe(false);
  });

  it('uses the same publication authority for the rendered Terms and Privacy pages', () => {
    expect(termsPage).toContain('PUBLIC_TERMS_PUBLICATION');
    expect(termsPage).toContain('version={PUBLIC_TERMS_PUBLICATION.version}');
    expect(termsPage).toContain('publicationState={PUBLIC_TERMS_PUBLICATION.state}');
    expect(privacyPage).toContain('PUBLIC_PRIVACY_PUBLICATION');
    expect(privacyPage).toContain('version={PUBLIC_PRIVACY_PUBLICATION.version}');
    expect(privacyPage).toContain('publicationState={PUBLIC_PRIVACY_PUBLICATION.state}');
  });

  it('binds explicit clickwrap versions and method into normal initial Stripe checkout evidence', () => {
    expect(PUBLIC_CONTRACT_ACCEPTANCE_METHOD).toBe('checkout_clickwrap_v1');
    expect(checkoutRoute).toContain('validationOnlyCheckout');
    expect(checkoutRoute).toContain("error: 'legal_publication_not_effective'");
    expect(checkoutRoute).toContain("error: 'terms_acceptance_required'");
    expect(checkoutRoute).toContain('terms_version: PUBLIC_TERMS_VERSION');
    expect(checkoutRoute).toContain('privacy_version: PUBLIC_PRIVACY_VERSION');
    expect(checkoutRoute).toContain("validation_only_no_contract_acceptance");
    expect(checkoutRoute).toContain('legal_validation_only');
  });

  it('preserves bounded validation checkout without pretending the review documents were accepted', () => {
    expect(checkoutRoute).toContain('validationOrganizationId === organization.id');
    expect(checkoutRoute).toContain("legalAcceptanceAt = validationOnlyCheckout ? ''");
    expect(checkoutRoute).toContain("validation_only_no_contract_acceptance");
    expect(checkoutRoute).toContain("legal_validation_only: validationOnlyCheckout ? 'true' : 'false'");
  });

  it('requires browser clickwrap only on the initial public checkout surface', () => {
    expect(billingAction).toContain('requireLegalAcceptance?: boolean');
    expect(billingAction).toContain("action === 'checkout' && requireLegalAcceptance");
    expect(billingAction).toContain("action === 'checkout' && requireLegalAcceptance && !legalAccepted");
    expect(checkoutPage).toContain('requireLegalAcceptance');
  });

  it('shows a privacy notice at account creation without treating signup as Terms acceptance', () => {
    expect(signupPage).toContain('getSignupPrivacyNotice');
    expect(signupPage).toContain(`href={\`/\${activeLocale}/privacy\`}`);
    expect(signupPage).not.toContain('PUBLIC_CONTRACT_ACCEPTANCE_METHOD');
  });

  it('expires a cached open Stripe session when its legal publication binding is stale', () => {
    expect(checkoutRoute).toContain('existingLegalMatches');
    expect(checkoutRoute).toContain('terms_version === PUBLIC_TERMS_VERSION');
    expect(checkoutRoute).toContain('privacy_version === PUBLIC_PRIVACY_VERSION');
    expect(checkoutRoute).toContain('billing_checkout_stale_legal_session_expire');
    expect(checkoutRoute).toContain('billing_checkout_stale_legal_session_release');
  });
});
