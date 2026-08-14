const ENVIRONMENT_GROUPS = new Set(['supabase', 'stripe', 'redis', 'sentry']);
const READINESS_STATUSES = new Set(['ready', 'not_ready', 'unauthorized']);
const DATABASE_DETAILS = new Set(['ok', 'not_ready']);
const STRIPE_DETAILS = new Set(['ok', 'not_ready', 'not_configured']);
const CHECK_KEYS = Object.freeze([
  'supabaseConfigured',
  'databaseReachable',
  'stripeConfigured',
  'stripeApiReachable',
  'redisConfigured',
  'sentryConfigured',
  'sentryObservabilityConfigured',
  'enterpriseStepUpConfigured',
  'enterpriseStorageScannerConfigured',
  'healthcheckProtected',
]);

function booleanField(source, key) {
  return typeof source?.[key] === 'boolean' ? source[key] : null;
}

function finiteNumberField(source, key) {
  return Number.isFinite(source?.[key]) ? Number(source[key]) : null;
}

function fixedLabel(value, allowed, fallback = 'unknown') {
  return typeof value === 'string' && allowed.has(value) ? value : fallback;
}

export function buildSafeReadinessDiagnostics(body) {
  if (!body || typeof body !== 'object') return { responseAvailable: false };

  const environment = Array.isArray(body.environment)
    ? body.environment.flatMap((item) => {
      const name = typeof item?.name === 'string' ? item.name : '';
      if (!ENVIRONMENT_GROUPS.has(name)) return [];
      return [{
        name,
        configured: booleanField(item, 'configured'),
        missingCount: finiteNumberField(item, 'missingCount'),
      }];
    })
    : [];

  const checks = Object.fromEntries(
    CHECK_KEYS.flatMap((key) => {
      const value = booleanField(body.checks, key);
      return value === null ? [] : [[key, value]];
    }),
  );

  return {
    responseAvailable: true,
    status: fixedLabel(body.status, READINESS_STATUSES),
    environment,
    database: {
      adminClient: booleanField(body.database, 'adminClient'),
      subscriptionsReadable: booleanField(body.database, 'subscriptionsReadable'),
      detail: fixedLabel(body.database?.detail, DATABASE_DETAILS),
    },
    stripe: {
      configured: booleanField(body.stripe, 'configured'),
      apiReachable: booleanField(body.stripe, 'apiReachable'),
      priceLookup: booleanField(body.stripe, 'priceLookup'),
      pricesChecked: finiteNumberField(body.stripe, 'pricesChecked'),
      detail: fixedLabel(body.stripe?.detail, STRIPE_DETAILS),
    },
    sentryReleaseUploads: {
      configured: booleanField(body.sentryReleaseUploads, 'configured'),
      missingCount: finiteNumberField(body.sentryReleaseUploads, 'missingCount'),
      sourceMapsUploadRequiresAuthToken: booleanField(body.sentryReleaseUploads, 'sourceMapsUploadRequiresAuthToken'),
    },
    enterpriseStepUp: {
      required: booleanField(body.enterpriseStepUp, 'required'),
      configured: booleanField(body.enterpriseStepUp, 'configured'),
      dedicatedSigningSecretConfigured: booleanField(body.enterpriseStepUp, 'dedicatedSigningSecretConfigured'),
      runtimeConfigurationConfigured: booleanField(body.enterpriseStepUp, 'runtimeConfigurationConfigured'),
    },
    enterpriseStorageScanner: {
      required: booleanField(body.enterpriseStorageScanner, 'required'),
      configured: booleanField(body.enterpriseStorageScanner, 'configured'),
      storageBucketConfigured: booleanField(body.enterpriseStorageScanner, 'storageBucketConfigured'),
      malwareScanningRequired: booleanField(body.enterpriseStorageScanner, 'malwareScanningRequired'),
      realScannerProviderConfigured: booleanField(body.enterpriseStorageScanner, 'realScannerProviderConfigured'),
      scannerTransportConfigured: booleanField(body.enterpriseStorageScanner, 'scannerTransportConfigured'),
    },
    checks,
  };
}
