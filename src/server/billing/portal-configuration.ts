const STRIPE_BILLING_PORTAL_CONFIGURATION_ID = 'STRIPE_BILLING_PORTAL_CONFIGURATION_ID';
const BILLING_PORTAL_CONFIGURATION_ID_PATTERN = /^bpc_[A-Za-z0-9]+$/;

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
  rawValue = process.env[STRIPE_BILLING_PORTAL_CONFIGURATION_ID],
): StripeBillingPortalConfigurationBinding {
  const configurationId = String(rawValue ?? '').trim();

  if (!configurationId) {
    return { ok: true, configurationId: null, source: 'default' };
  }

  if (!BILLING_PORTAL_CONFIGURATION_ID_PATTERN.test(configurationId)) {
    return { ok: false, error: 'billing_portal_configuration_invalid' };
  }

  return { ok: true, configurationId, source: 'explicit' };
}
