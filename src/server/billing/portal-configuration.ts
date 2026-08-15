import portalContract from '../../../config/stripe-billing-portal-contract.json';

const BILLING_PORTAL_CONTRACT_SCHEMA = 'risck-comply.stripe-billing-portal-contract.v1';
const BILLING_PORTAL_CONFIGURATION_ID_PATTERN = /^bpc_[A-Za-z0-9]+$/;

type StripeBillingPortalContract = {
  schema?: unknown;
  configurationId?: unknown;
};

export type StripeBillingPortalConfigurationBinding =
  | {
      ok: true;
      configurationId: string | null;
      source: 'explicit' | 'default';
    }
  | {
      ok: false;
      error: 'billing_portal_configuration_invalid';
    };

export function resolveStripeBillingPortalConfigurationBinding(
  contract: StripeBillingPortalContract = portalContract,
): StripeBillingPortalConfigurationBinding {
  if (contract?.schema !== BILLING_PORTAL_CONTRACT_SCHEMA) {
    return { ok: false, error: 'billing_portal_configuration_invalid' };
  }

  if (contract.configurationId === null || contract.configurationId === undefined) {
    return { ok: true, configurationId: null, source: 'default' };
  }

  if (
    typeof contract.configurationId !== 'string'
    || !BILLING_PORTAL_CONFIGURATION_ID_PATTERN.test(contract.configurationId)
  ) {
    return { ok: false, error: 'billing_portal_configuration_invalid' };
  }

  return { ok: true, configurationId: contract.configurationId, source: 'explicit' };
}
