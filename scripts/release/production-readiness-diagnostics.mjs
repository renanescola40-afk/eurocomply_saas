const ENVIRONMENT_GROUP_LIMITS = Object.freeze({
  supabase: 3,
  stripe: 4,
  redis: 2,
  sentry: 1,
});
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

function boundedIntegerField(source, key, minimum, maximum) {
  const value = source?.[key];
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : null;
}

function fixedLabel(value, allowed, fallback = 'unknown') {
  return typeof value === 'string' && allowed.has(value) ? value : fallback;
}

function boundedEnvironmentDiagnostics(environment) {
  if (!Array.isArray(environment)) return [];

  return Object.entries(ENVIRONMENT_GROUP_LIMITS).flatMap(([name, maximumMissing]) => {
    const item = environment.find((candidate) => candidate?.name === name);
    if (!item) return [];
    return [{
      name,
      configured: booleanField(item, 'configured'),
      missingCount: boundedIntegerField(item, 'missingCount', 0, maximumMissing),
    }];
  });
}

export function buildSafeReadinessDiagnostics(body) {
  if (!body || typeof body !== 'object') return { responseAvailable: false };

  const checks = Object.fromEntries(
    CHECK_KEYS.flatMap((key) => {
      const value = booleanField(body.checks, key);
      return value === null ? [] : [[key, value]];
    }),
  );

  return {
    responseAvailable: true,
    status: fixedLabel(body.status, READINESS_STATUSES),
    environment: boundedEnvironmentDiagnostics(body.environment),
    database: {
      adminClient: booleanField(body.database, 'adminClient'),
      subscriptionsReadable: booleanField(body.database, 'subscriptionsReadable'),
      detail: fixedLabel(body.database?.detail, DATABASE_DETAILS),
    },
    stripe: {
      configured: booleanField(body.stripe, 'configured'),
      apiReachable: booleanField(body.stripe, 'apiReachable'),
      priceLookup: booleanField(body.stripe, 'priceLookup'),
      pricesChecked: boundedIntegerField(body.stripe, 'pricesChecked', 0, 2),
      detail: fixedLabel(body.stripe?.detail, STRIPE_DETAILS),
    },
    sentryReleaseUploads: {
      configured: booleanField(body.sentryReleaseUploads, 'configured'),
      missingCount: boundedIntegerField(body.sentryReleaseUploads, 'missingCount', 0, 2),
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
