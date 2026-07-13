#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/enterprise-release-env-readiness.json';
const setupChecklistPath = 'docs/operations/ENTERPRISE_GITHUB_ACTIONS_SECRETS_AND_VARS.md';
const generatedAt = new Date().toISOString();
const releaseTarget = process.env.RELEASE_TARGET || 'enterprise';
const commitSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null;
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
const allowedReleaseTargets = new Set(['enterprise', 'production', 'public-production']);

function hasAny(names) {
  return names.some((name) => Boolean(String(process.env[name] || '').trim()));
}

function hasAll(names) {
  return names.every((name) => Boolean(String(process.env[name] || '').trim()));
}

function group(name, required, passed, detail, remediation) {
  return { name, required, passed: Boolean(passed), detail, remediation };
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
const sentrySourceMapUploadRequired = releaseTarget === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';
const explicitProductionUrlSources = ['RELEASE_DEPLOYMENT_URL', 'RELEASE_PRODUCTION_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL'];

const checks = [
  group('releaseTarget', true, allowedReleaseTargets.has(releaseTarget), { releaseTarget, acceptedTargets: [...allowedReleaseTargets] }, 'Run the workflow with release_target set to enterprise or production.'),
  group('deploymentTargetConfigured', true, hasAny(explicitProductionUrlSources), {
    acceptedSources: explicitProductionUrlSources,
    rejectedAmbiguousSources: ['VERCEL_URL'],
  }, 'Set an explicit production deployment URL in GitHub Actions configuration. Do not rely on VERCEL_URL because it may identify a preview deployment.'),
  group('healthcheckTokenConfigured', true, hasAny(['HEALTHCHECK_TOKEN']), { acceptedSources: ['HEALTHCHECK_TOKEN'] }, 'Set HEALTHCHECK_TOKEN as a GitHub Secret matching the protected readiness token.'),
  group('releaseCommitShaConfigured', true, Boolean(commitSha), { sourcePresent: Boolean(commitSha) }, 'Set RELEASE_COMMIT_SHA or allow GitHub Actions to provide GITHUB_SHA.'),
  group('releaseBuildShaConfigured', true, Boolean(buildSha), { sourcePresent: Boolean(buildSha) }, 'Set RELEASE_BUILD_SHA or allow GitHub Actions to provide GITHUB_SHA.'),
  group('supabaseConfigured', true, hasAll(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']), {
    requiredCount: 3,
  }, 'Set Supabase URL, anon key and service-role key for the target production project.'),
  group('stripeConfigured', true, hasAll(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) && stripePricesReady, {
    requiresSecretKey: true,
    requiresWebhookSecret: true,
    requiresStarterGrowthEnterprisePricesOrLegacyFallbacks: true,
  }, 'Set Stripe secret key, webhook secret and monthly price IDs for the configured pricing model.'),
  group('redisConfigured', true, hasAll(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']), { requiredCount: 2 }, 'Set Upstash Redis REST URL and token for rate-limit/session runtime checks.'),
  group('sentryConfigured', true, hasAny(['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN']), { requiresDsn: true }, 'Set at least one Sentry DSN source for runtime observability.'),
  group('sentrySourceMapUploadConfigured', sentrySourceMapUploadRequired, hasAll(['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN']), {
    requiredForEnterprise: sentrySourceMapUploadRequired,
  }, 'Set Sentry org, project and auth token for enterprise source-map release validation.'),
  group('rollbackTargetConfigured', true, hasAny(['RELEASE_ROLLBACK_TARGET', 'RELEASE_ROLLBACK_TARGET_URL', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL']), {
    acceptedSources: ['RELEASE_ROLLBACK_TARGET', 'RELEASE_ROLLBACK_TARGET_URL', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL'],
  }, 'Set the last-known-good deployment URL or rollback target URL.'),
  group('rollbackCommitConfigured', true, hasAny(['RELEASE_ROLLBACK_TARGET_SHA', 'RELEASE_ROLLBACK_TARGET_COMMIT_SHA', 'LAST_KNOWN_GOOD_COMMIT_SHA', 'LAST_KNOWN_GOOD_SHA']), {
    acceptedSources: ['RELEASE_ROLLBACK_TARGET_SHA', 'RELEASE_ROLLBACK_TARGET_COMMIT_SHA', 'LAST_KNOWN_GOOD_COMMIT_SHA', 'LAST_KNOWN_GOOD_SHA'],
  }, 'Set the last-known-good commit SHA associated with the rollback target.'),
  group('rollbackFunctionalValidationFlagConfigured', true, process.env.RELEASE_ROLLBACK_TARGET_VALIDATED === 'true', {
    requiredValue: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true',
  }, 'Set RELEASE_ROLLBACK_TARGET_VALIDATED=true only after the rollback target has been smoke-tested.'),
  group('enterpriseUploadScannerConfigured', enterpriseScannerRequired, !enterpriseScannerRequired || (scannerProvider && !['none', 'disabled', 'not_configured'].includes(scannerProvider) && scannerTransportReady), {
    requiredForEnterprise: enterpriseScannerRequired,
    transport: scannerProvider ? (['clamav', 'clamd'].includes(scannerProvider) ? 'clamav' : 'http') : 'missing',
  }, 'Configure a real upload malware scanner transport for enterprise release.'),
];

const failedChecks = checks.filter((check) => check.required && !check.passed);
const failures = failedChecks.map((check) => check.name);
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
  summary: outcome === 'passed'
    ? 'Enterprise production environment preflight verified that every required provider configuration group was present in the runner environment without writing secret values.'
    : 'Enterprise production environment preflight failed closed because one or more required provider configuration groups were missing from the runner environment.',
  evidenceLocations: [
    evidencePath,
    'scripts/release/check-enterprise-release-env.mjs',
    'scripts/release/run-public-production-release.mjs',
    'scripts/release/run-public-production-release-v2.mjs',
    '.github/workflows/enterprise-production-gate.yml',
    '.github/workflows/public-production-final.yml',
    'docs/operations/ENTERPRISE_PRODUCTION_ENVIRONMENT_CHECKLIST.md',
    setupChecklistPath,
  ],
  commitSha,
  buildSha,
  commandsExecuted: ['node scripts/release/check-enterprise-release-env.mjs'],
  controlsVerified: outcome === 'passed' ? checks.filter((check) => check.required && check.passed).map((check) => check.name) : [],
  checks,
  failures,
  missingConfigurationGroups: failedChecks.map((check) => ({
    name: check.name,
    remediation: check.remediation,
    acceptedSources: check.detail?.acceptedSources || null,
  })),
  redactionConfirmation: 'Only grouped configuration presence and accepted source labels are recorded. No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.',
  noSecretsStored: true,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
    rawUrlsStored: false,
    placeholderOnly: outcome !== 'passed',
  },
  releaseGate: outcome === 'passed'
    ? 'Enterprise release env preflight passed. Runtime smoke must still prove services are reachable.'
    : 'Enterprise release is blocked and remains No-Go until required production configuration is present in the runner environment.',
};

function writeStepSummary() {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const lines = [
    '## RISCK COMPLY Enterprise Env Preflight',
    '',
    `Outcome: **${outcome}**`,
    `Evidence: \`${evidencePath}\``,
    `Setup checklist: \`${setupChecklistPath}\``,
    '',
  ];

  if (failedChecks.length > 0) {
    lines.push('### Missing configuration groups', '');
    for (const check of failedChecks) {
      lines.push(`- **${check.name}** — ${check.remediation}`);
    }
    lines.push('', 'No secret values were printed or written to evidence.');
  } else {
    lines.push('All required configuration groups are present. Runtime smoke still needs to pass against the target deployment.');
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeStepSummary();
console.log(`Wrote ${evidencePath}`);

if (failures.length > 0) {
  console.error('Enterprise release env preflight failed:');
  for (const check of failedChecks) {
    console.error(`- ${check.name}: ${check.remediation}`);
    console.error(`::error title=Enterprise env preflight missing ${check.name}::${check.remediation} See ${setupChecklistPath}.`);
  }
  process.exit(1);
}

console.log('Enterprise release env preflight passed.');
