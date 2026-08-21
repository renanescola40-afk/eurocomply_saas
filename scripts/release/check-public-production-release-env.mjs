#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/public-production-release-env-readiness.json';
const generatedAt = new Date().toISOString();
const releaseTarget = String(process.env.RELEASE_TARGET || 'public-production').trim().toLowerCase();
const commitSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null;
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
const allowedReleaseTargets = new Set(['production', 'public-production']);

function hasAny(names) {
  return names.some((name) => Boolean(String(process.env[name] || '').trim()));
}

function hasAll(names) {
  return names.every((name) => Boolean(String(process.env[name] || '').trim()));
}

function group(name, passed, detail, remediation) {
  return { name, required: true, passed: Boolean(passed), detail, remediation };
}

const stripePriceCanonical = [
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_ESSENTIAL_ANNUAL',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
];
const stripePricesReady = hasAll(stripePriceCanonical);
const explicitProductionUrlSources = ['RELEASE_DEPLOYMENT_URL', 'RELEASE_PRODUCTION_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL'];

const checks = [
  group('releaseTarget', allowedReleaseTargets.has(releaseTarget), { releaseTarget, acceptedTargets: [...allowedReleaseTargets] }, 'Set RELEASE_TARGET to public-production or production.'),
  group('deploymentTargetConfigured', hasAny(explicitProductionUrlSources), {
    acceptedSources: explicitProductionUrlSources,
    rejectedAmbiguousSources: ['VERCEL_URL'],
  }, 'Set an explicit public production URL. Do not rely on VERCEL_URL because it may identify a preview deployment.'),
  group('healthcheckTokenConfigured', hasAny(['HEALTHCHECK_TOKEN']), { acceptedSources: ['HEALTHCHECK_TOKEN'] }, 'Set HEALTHCHECK_TOKEN to match the protected readiness endpoint.'),
  group('releaseCommitShaConfigured', Boolean(commitSha), { sourcePresent: Boolean(commitSha) }, 'Set RELEASE_COMMIT_SHA or run in GitHub Actions so GITHUB_SHA is available.'),
  group('releaseBuildShaConfigured', Boolean(buildSha), { sourcePresent: Boolean(buildSha) }, 'Set RELEASE_BUILD_SHA or run in GitHub Actions so GITHUB_SHA is available.'),
  group('supabaseConfigured', hasAll(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']), { requiredCount: 3 }, 'Set the Supabase URL, anon key, and service-role key for the target production project.'),
  group('stripeConfigured', hasAll(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) && stripePricesReady, {
    requiresSecretKey: true,
    requiresWebhookSecret: true,
    requiresCanonicalSelfServePrices: stripePriceCanonical,
    legacyAliasesAcceptedForReadiness: false,
  }, 'Set the Stripe secret key, webhook secret, and all four canonical Essential/Professional monthly+annual production Price bindings. Legacy Starter/Growth aliases do not authorize release readiness.'),
  group('redisConfigured', hasAll(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']), { requiredCount: 2 }, 'Set the distributed rate-limit Redis URL and token.'),
  group('sentryConfigured', hasAny(['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN']), { requiresDsn: true }, 'Set a Sentry DSN for production error reporting. Enterprise source-map upload credentials are not required by this public profile.'),
  group('rollbackTargetConfigured', hasAny(['RELEASE_ROLLBACK_TARGET', 'RELEASE_ROLLBACK_TARGET_URL', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL']), {
    acceptedSources: ['RELEASE_ROLLBACK_TARGET', 'RELEASE_ROLLBACK_TARGET_URL', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL'],
  }, 'Set a last-known-good deployment URL or rollback target.'),
  group('rollbackCommitConfigured', hasAny(['RELEASE_ROLLBACK_TARGET_SHA', 'RELEASE_ROLLBACK_TARGET_COMMIT_SHA', 'LAST_KNOWN_GOOD_COMMIT_SHA', 'LAST_KNOWN_GOOD_SHA']), {
    acceptedSources: ['RELEASE_ROLLBACK_TARGET_SHA', 'RELEASE_ROLLBACK_TARGET_COMMIT_SHA', 'LAST_KNOWN_GOOD_COMMIT_SHA', 'LAST_KNOWN_GOOD_SHA'],
  }, 'Set the commit SHA associated with the rollback target.'),
  group('rollbackFunctionalValidationFlagConfigured', process.env.RELEASE_ROLLBACK_TARGET_VALIDATED === 'true', {
    requiredValue: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true',
  }, 'Set RELEASE_ROLLBACK_TARGET_VALIDATED=true only after the rollback target has been smoke-tested.'),
];

const failedChecks = checks.filter((check) => !check.passed);
const outcome = failedChecks.length === 0 ? 'passed' : 'failed';
const evidence = {
  schema: 'risck-comply.public-production-release-env-readiness.v1',
  evidenceItem: 'public-production-release-env-readiness',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY public production release automation',
  runner: 'RISCK COMPLY public production release automation',
  releaseTarget,
  summary: outcome === 'passed'
    ? 'Public production environment preflight verified the required provider and rollback configuration groups without writing secret values.'
    : 'Public production environment preflight failed closed because one or more required configuration groups were missing.',
  commitSha,
  buildSha,
  checks,
  failures: failedChecks.map((check) => check.name),
  missingConfigurationGroups: failedChecks.map((check) => ({
    name: check.name,
    remediation: check.remediation,
    acceptedSources: check.detail?.acceptedSources || null,
  })),
  enterpriseOnlyControlsExcluded: [
    'Sentry source-map upload credentials',
    'enterprise malware-scanner transport requirement',
    'enterprise runtime evidence bundle',
    'external review or pentest evidence',
  ],
  redactionConfirmation: 'Only grouped configuration presence and accepted source labels are recorded. No secret values, URLs, DSNs, tokens, cookies, Authorization headers, or customer data are stored.',
  noSecretsStored: true,
};

function writeStepSummary() {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const lines = [
    '## RISCK COMPLY Public Production Env Preflight',
    '',
    `Outcome: **${outcome}**`,
    `Evidence: \`${evidencePath}\``,
    '',
  ];
  if (failedChecks.length > 0) {
    lines.push('### Missing configuration groups', '');
    for (const check of failedChecks) lines.push(`- **${check.name}** — ${check.remediation}`);
    lines.push('', 'No secret values were printed or written to evidence.');
  } else {
    lines.push('All public production configuration groups are present. Runtime smoke and live P0 evidence must still pass.');
  }
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeStepSummary();
console.log(`Wrote ${evidencePath}`);

if (failedChecks.length > 0) {
  console.error('Public production release env preflight failed:');
  for (const check of failedChecks) {
    console.error(`- ${check.name}: ${check.remediation}`);
    console.error(`::error title=Public production env preflight missing ${check.name}::${check.remediation}`);
  }
  process.exit(1);
}

console.log('Public production release env preflight passed.');
