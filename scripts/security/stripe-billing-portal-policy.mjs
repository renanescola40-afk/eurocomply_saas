import { readFileSync } from 'node:fs';

export const STRIPE_BILLING_PORTAL_POLICY_PATH = 'config/stripe-billing-portal-policy.json';
export const STRIPE_BILLING_PORTAL_POLICY_SCHEMA = 'risck-comply.stripe-billing-portal-policy.v1';

const CUSTOMER_UPDATE_VALUES = new Set(['address', 'email', 'name', 'phone', 'shipping', 'tax_id']);
const METADATA_KEY_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const METADATA_VALUE_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;

function requireBoolean(value, name) {
  if (typeof value !== 'boolean') throw new Error(`Invalid Stripe Billing Portal policy boolean: ${name}`);
  return value;
}

function normalizedStringSet(values) {
  return [...new Set(values.map((value) => String(value)))].sort();
}

function sameStringSet(left, right) {
  const a = normalizedStringSet(left);
  const b = normalizedStringSet(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function validateStripeBillingPortalPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    throw new Error('Invalid Stripe Billing Portal policy object');
  }

  if (policy.schema !== STRIPE_BILLING_PORTAL_POLICY_SCHEMA) {
    throw new Error('Invalid Stripe Billing Portal policy schema');
  }

  const defaultReturnUrl = String(policy.defaultReturnUrl ?? '').trim();
  let parsedReturnUrl;
  try {
    parsedReturnUrl = new URL(defaultReturnUrl);
  } catch {
    throw new Error('Invalid Stripe Billing Portal default return URL');
  }
  if (parsedReturnUrl.protocol !== 'https:' || parsedReturnUrl.hostname !== 'www.risckcomply.com') {
    throw new Error('Stripe Billing Portal return URL must use the canonical production host');
  }

  const managementMetadata = policy.managementMetadata;
  if (!managementMetadata || typeof managementMetadata !== 'object' || Array.isArray(managementMetadata)) {
    throw new Error('Invalid Stripe Billing Portal management metadata');
  }
  const metadataEntries = Object.entries(managementMetadata);
  if (metadataEntries.length === 0 || metadataEntries.length > 10) {
    throw new Error('Stripe Billing Portal management metadata must contain 1-10 entries');
  }
  for (const [key, value] of metadataEntries) {
    if (!METADATA_KEY_PATTERN.test(key) || !METADATA_VALUE_PATTERN.test(String(value))) {
      throw new Error('Invalid Stripe Billing Portal management metadata entry');
    }
  }

  const features = policy.features;
  if (!features || typeof features !== 'object' || Array.isArray(features)) {
    throw new Error('Invalid Stripe Billing Portal feature policy');
  }

  const customerUpdate = features.customerUpdate;
  if (!customerUpdate || typeof customerUpdate !== 'object' || Array.isArray(customerUpdate)) {
    throw new Error('Invalid Stripe Billing Portal customer-update policy');
  }
  const customerUpdateEnabled = requireBoolean(customerUpdate.enabled, 'customerUpdate.enabled');
  const allowedUpdates = Array.isArray(customerUpdate.allowedUpdates)
    ? normalizedStringSet(customerUpdate.allowedUpdates)
    : null;
  if (!allowedUpdates || allowedUpdates.some((value) => !CUSTOMER_UPDATE_VALUES.has(value))) {
    throw new Error('Invalid Stripe Billing Portal customer-update fields');
  }
  if (customerUpdateEnabled && allowedUpdates.length === 0) {
    throw new Error('Enabled Stripe Billing Portal customer update requires allowed fields');
  }
  if (!customerUpdateEnabled && allowedUpdates.length > 0) {
    throw new Error('Disabled Stripe Billing Portal customer update cannot allow fields');
  }

  const normalized = {
    schema: STRIPE_BILLING_PORTAL_POLICY_SCHEMA,
    defaultReturnUrl,
    managementMetadata: Object.fromEntries(metadataEntries.map(([key, value]) => [key, String(value)])),
    features: {
      customerUpdate: {
        enabled: customerUpdateEnabled,
        allowedUpdates,
      },
      invoiceHistory: {
        enabled: requireBoolean(features.invoiceHistory?.enabled, 'invoiceHistory.enabled'),
      },
      paymentMethodUpdate: {
        enabled: requireBoolean(features.paymentMethodUpdate?.enabled, 'paymentMethodUpdate.enabled'),
      },
      subscriptionCancel: {
        enabled: requireBoolean(features.subscriptionCancel?.enabled, 'subscriptionCancel.enabled'),
      },
      subscriptionUpdate: {
        enabled: requireBoolean(features.subscriptionUpdate?.enabled, 'subscriptionUpdate.enabled'),
      },
    },
  };

  if (normalized.features.subscriptionCancel.enabled || normalized.features.subscriptionUpdate.enabled) {
    throw new Error('Stripe Billing Portal subscription lifecycle must remain application-controlled');
  }

  return normalized;
}

export function loadStripeBillingPortalPolicy(path = STRIPE_BILLING_PORTAL_POLICY_PATH) {
  return validateStripeBillingPortalPolicy(JSON.parse(readFileSync(path, 'utf8')));
}

export function buildStripeBillingPortalCreateBody(policyInput) {
  const policy = validateStripeBillingPortalPolicy(policyInput);
  const body = new URLSearchParams();

  body.set('default_return_url', policy.defaultReturnUrl);
  body.set('features[customer_update][enabled]', String(policy.features.customerUpdate.enabled));
  for (const update of policy.features.customerUpdate.allowedUpdates) {
    body.append('features[customer_update][allowed_updates][]', update);
  }
  body.set('features[invoice_history][enabled]', String(policy.features.invoiceHistory.enabled));
  body.set('features[payment_method_update][enabled]', String(policy.features.paymentMethodUpdate.enabled));
  body.set('features[subscription_cancel][enabled]', String(policy.features.subscriptionCancel.enabled));
  body.set('features[subscription_update][enabled]', String(policy.features.subscriptionUpdate.enabled));

  for (const [key, value] of Object.entries(policy.managementMetadata)) {
    body.set(`metadata[${key}]`, value);
  }

  return body;
}

export function stripeBillingPortalConfigurationMatchesPolicy(configuration, policyInput, { requireManagementMetadata = false } = {}) {
  const policy = validateStripeBillingPortalPolicy(policyInput);
  if (!configuration || typeof configuration !== 'object') return false;

  const customerUpdate = configuration.features?.customer_update;
  const invoiceHistory = configuration.features?.invoice_history;
  const paymentMethodUpdate = configuration.features?.payment_method_update;
  const subscriptionCancel = configuration.features?.subscription_cancel;
  const subscriptionUpdate = configuration.features?.subscription_update;

  const featureMatch = configuration.default_return_url === policy.defaultReturnUrl
    && customerUpdate?.enabled === policy.features.customerUpdate.enabled
    && sameStringSet(customerUpdate?.allowed_updates ?? [], policy.features.customerUpdate.allowedUpdates)
    && invoiceHistory?.enabled === policy.features.invoiceHistory.enabled
    && paymentMethodUpdate?.enabled === policy.features.paymentMethodUpdate.enabled
    && subscriptionCancel?.enabled === policy.features.subscriptionCancel.enabled
    && subscriptionUpdate?.enabled === policy.features.subscriptionUpdate.enabled;

  if (!featureMatch) return false;
  if (!requireManagementMetadata) return true;

  return Object.entries(policy.managementMetadata).every(([key, value]) => configuration.metadata?.[key] === value);
}

export function findManagedStripeBillingPortalConfigurations(configurations, policyInput) {
  const policy = validateStripeBillingPortalPolicy(policyInput);
  if (!Array.isArray(configurations)) return [];
  return configurations.filter((configuration) => (
    configuration?.active === true
    && Object.entries(policy.managementMetadata).every(([key, value]) => configuration.metadata?.[key] === value)
  ));
}
