#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/enterprise-release-env-readiness.json';
const generatedAt = new Date().toISOString();
const releaseTarget = process.env.RELEASE_TARGET || 'enterprise';
const commitSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null;
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;

function hasAny(names) {
  return names.some((name) => Boolean(String(process.env[name] || '').trim()));
}

function hasAll(names) {
  return names.every((name) => Boolean(String(process.env[name] || '').trim()));
}

function group(name, required, passed, detail) {
  return { name, required, passed: Boolean(passed), detail };
}

const stripePricePrimary = ['STRIPE_PRICE_STARTER_MONTHLY', 'STRIPE_PRICE_GROWTH_MONTHLY', 'STRIPE_PRICE_ENTERPRISE_MONTHLY'];
const stripePriceLegacyGroups = [
  ['STRIPE_PRICE_ESSENTIAL_MONTHLY'],
  ['STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'STRIPE_PRICE_BUSINESS_MONTHLY'],
  ['STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'],
];

const stripePricesReady = stripePricePrimary.every((name, index) => Boolean(String(process.env[name] || '').trim()) || hasAny(stripePriceLegacyGroups[index]));
const httpScannerReady = hasAny(['MALWARE_SCANNER_ENDPOINT', 'MALWARE_SCANNER_URL']) && hasAny(['MALWARE_SCANNER_ALLOWED_HOSTS']);
const clamavScannerReady = hasAny(['MALWARE_SCANNER_CLAMAV_HOST']) && hasAny(['MALWARE_SCANNER_CLAMAV_PORT']);
const scannerProvider = String(process.env.MALWARE_SCANNER_PROVIDER || '').trim().toLowerCase();
const enterpriseScannerRequired = releaseTarget === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true' || process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS === 'true';
const scannerTransportReady = ['clamav', 'clamd'].includes(scannerProvider)
  ? clamavScannerReady
  : ['http', 'generic-http', 'webhook'].includes(scannerProvider) && httpScannerReady;

const checks = [
  group('releaseTarget', true, releaseTarget === 'enterprise' || releaseTarget === 'production', { releaseTarget }),
  group('deploymentTargetConfigured', true, hasAny(['RELEASE_DEPLOYMENT_URL', 'RELEASE_PRODUCTION_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'VERCEL_URL']), {
    acceptedSources: ['RELEASE_DEPLOYMENT_URL', 'RELEASE_PRODUCTION_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'VERCEL_URL'],
  }),
  group('healthcheckTokenConfigured', true, hasAny(['HEALTHCHECK_TOKEN']), { acceptedSources: ['HEALTHCHECK_TOKEN'] }),
  group('releaseCommitShaConfigured', true, Boolean(commitSha), { sourcePresent: Boolean(commitSha) }),
  group('releaseBuildShaConfigured', true, Boolean(buildSha), { sourcePresent: Boolean(buildSha) }),
  group('supabaseConfigured', true, hasAll(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']), {
    requiredCount: 3,
  }),
  group('stripeConfigured', true, hasAll(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) && stripePricesReady, {
    requiresSecretKey: true,
    requiresWebhookSecret: true,
    requiresStarterGrowthEnterprisePricesOrLegacyFallbacks: true,
  }),
  group('redisConfigured', true, hasAll(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']), { requiredCount: 2 }),
  group('sentryConfigured', true, hasAny(['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN']), { requiresDsn: true }),
  group('sentrySourceMapUploadConfigured', releaseTarget === 'enterprise', hasAll(['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN']), {
    requiredForEnterprise: true,
  }),
  group('rollbackTargetConfigured', true, hasAny(['RELEASE_ROLLBACK_TARGET', 'RELEASE_ROLLBACK_TARGET_URL', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL']), {
    acceptedSources: ['RELEASE_ROLLBACK_TARGET', 'RELEASE_ROLLBACK_TARGET_URL', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL'],
  }),
  group('rollbackCommitConfigured', true, hasAny(['RELEASE_ROLLBACK_TARGET_SHA', 'RELEASE_ROLLBACK_TARGET_COMMIT_SHA', 'LAST_KNOWN_GOOD_COMMIT_SHA', 'LAST_KNOWN_GOOD_SHA']), {
    acceptedSources: ['RELEASE_ROLLBACK_TARGET_SHA', 'RELEASE_ROLLBACK_TARGET_COMMIT_SHA', 'LAST_KNOWN_GOOD_COMMIT_SHA', 'LAST_KNOWN_GOOD_SHA'],
  }),
  group('rollbackFunctionalValidationFlagConfigured', true, process.env.RELEASE_ROLLBACK_TARGET_VALIDATED === 'true', {
    requiredValue: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true',
  }),
  group('enterpriseUploadScannerConfigured', enterpriseScannerRequired, !enterpriseScannerRequired || (scannerProvider && !['none', 'disabled', 'not_configured'].includes(scannerProvider) && scannerTransportReady), {
    requiredForEnterprise: enterpriseScannerRequired,
    transport: scannerProvider ? (['clamav', 'clamd'].includes(scannerProvider) ? 'clamav' : 'http') : 'missing',
  }),
];

const failures = checks.filter((check) => check.required && !check.passed).map((check) => check.name);
const outcome = failures.length === 0 ? 'passed' : 'failed';

const evidence = {
  schema: 'risck-comply.enterprise-release-env-readiness.v1',
  evidenceItem: 'enterprise-release-env-readiness',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY enterprise release automation',
  runner: 'RISCK COMPLY enterprise release automation',
  releaseTarget,
  commitSha,
  buildSha,
  commandsExecuted: ['node scripts/release/check-enterprise-release-env.mjs'],
  controlsVerified: outcome === 'passed' ? checks.filter((check) => check.required && check.passed).map((check) => check.name) : [],
  checks,
  failures,
  redactionConfirmation: 'Only grouped configuration presence and accepted source labels are recorded. No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.',
  noSecretsStored: true,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
    rawUrlsStored: false,
  },
  releaseGate: outcome === 'passed'
    ? 'Enterprise release env preflight passed. Runtime smoke must still prove services are reachable.'
    : 'Enterprise release remains No-Go until required production configuration is present in the runner environment.',
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);

if (failures.length > 0) {
  console.error('Enterprise release env preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Enterprise release env preflight passed.');
