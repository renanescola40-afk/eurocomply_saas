import { describe, expect, it } from 'vitest';

import { getAddOnCheckoutReleaseState, isAddOnCheckoutEnabled } from './add-on-release';

const RELEASE_SHA = 'a'.repeat(40);

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    ADDON_CHECKOUT_ENABLED: 'true',
    ADDON_BASE_BILLING_RUNTIME_ACCEPTED: 'true',
    OWNER_ENABLEMENT_AUTHORIZED: 'true',
    ADDON_ACCEPTED_PRODUCTION_SHA: RELEASE_SHA,
    VERCEL_GIT_COMMIT_SHA: RELEASE_SHA,
    ...overrides,
  };
}

describe('add-on production release gate', () => {
  it('fails closed when no enablement inputs are configured', () => {
    expect(isAddOnCheckoutEnabled({})).toBe(false);
  });

  it('requires the explicit checkout enablement flag', () => {
    expect(isAddOnCheckoutEnabled(environment({ ADDON_CHECKOUT_ENABLED: 'false' }))).toBe(false);
  });

  it('requires accepted base billing runtime', () => {
    expect(isAddOnCheckoutEnabled(environment({ ADDON_BASE_BILLING_RUNTIME_ACCEPTED: 'false' }))).toBe(false);
  });

  it('requires explicit owner production enablement authorization', () => {
    expect(isAddOnCheckoutEnabled(environment({ OWNER_ENABLEMENT_AUTHORIZED: 'false' }))).toBe(false);
  });

  it('requires the deployed runtime SHA to equal the accepted production SHA', () => {
    const state = getAddOnCheckoutReleaseState(environment({ VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) }));

    expect(state.exactShaAccepted).toBe(false);
    expect(state.enabled).toBe(false);
  });

  it('rejects missing or malformed accepted SHAs', () => {
    expect(isAddOnCheckoutEnabled(environment({ ADDON_ACCEPTED_PRODUCTION_SHA: undefined }))).toBe(false);
    expect(isAddOnCheckoutEnabled(environment({ ADDON_ACCEPTED_PRODUCTION_SHA: 'main' }))).toBe(false);
  });

  it('opens only when every release prerequisite is explicitly satisfied', () => {
    const state = getAddOnCheckoutReleaseState(environment());

    expect(state).toMatchObject({
      enabled: true,
      checkoutEnabled: true,
      baseBillingRuntimeAccepted: true,
      ownerEnablementAuthorized: true,
      exactShaAccepted: true,
      runtimeCommitSha: RELEASE_SHA,
      acceptedProductionSha: RELEASE_SHA,
    });
  });
});
