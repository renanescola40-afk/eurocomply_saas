import { normalizeRuntimeCommitSha, runtimeReleaseMetadata } from '@/server/release/runtime-release-metadata';

type AddOnReleaseEnvironment = Record<string, string | undefined>;

export type AddOnCheckoutReleaseState = {
  enabled: boolean;
  checkoutEnabled: boolean;
  baseBillingRuntimeAccepted: boolean;
  ownerEnablementAuthorized: boolean;
  exactShaAccepted: boolean;
  runtimeCommitSha: string | null;
  acceptedProductionSha: string | null;
};

export function getAddOnCheckoutReleaseState(
  environment: AddOnReleaseEnvironment = process.env,
): AddOnCheckoutReleaseState {
  const checkoutEnabled = environment.ADDON_CHECKOUT_ENABLED === 'true';
  const baseBillingRuntimeAccepted = environment.ADDON_BASE_BILLING_RUNTIME_ACCEPTED === 'true';
  const ownerEnablementAuthorized = environment.OWNER_ENABLEMENT_AUTHORIZED === 'true';
  const runtime = runtimeReleaseMetadata(environment);
  const acceptedProductionSha = normalizeRuntimeCommitSha(environment.ADDON_ACCEPTED_PRODUCTION_SHA);
  const exactShaAccepted = Boolean(
    runtime.available
    && runtime.commitSha
    && acceptedProductionSha
    && runtime.commitSha === acceptedProductionSha,
  );

  return {
    enabled: checkoutEnabled && baseBillingRuntimeAccepted && ownerEnablementAuthorized && exactShaAccepted,
    checkoutEnabled,
    baseBillingRuntimeAccepted,
    ownerEnablementAuthorized,
    exactShaAccepted,
    runtimeCommitSha: runtime.commitSha,
    acceptedProductionSha,
  };
}

export function isAddOnCheckoutEnabled(environment: AddOnReleaseEnvironment = process.env) {
  return getAddOnCheckoutReleaseState(environment).enabled;
}
