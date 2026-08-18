import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPath = '.github/workflows/enterprise-runtime-evidence-closeout.yml';
const authenticatedSmokePath = 'scripts/release/run-authenticated-production-smoke.mjs';
const productionObservabilityPath = 'scripts/release/run-production-observability-validation.mjs';
const closeoutValidatorPath = 'scripts/release/validate-enterprise-runtime-closeout.mjs';
const publicFinalPath = 'scripts/release/run-public-production-release-final.mjs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const workflow = read(workflowPath);
const validator = read(closeoutValidatorPath);
const publicFinal = read(publicFinalPath);

test('runtime closeout calls real producers instead of undefined npm aliases', () => {
  assert.equal(workflow.includes('npm run smoke:authenticated'), false);
  assert.equal(workflow.includes('npm run observability:production:validate'), false);
  assert.match(workflow, /node scripts\/release\/run-authenticated-production-smoke\.mjs/);
  assert.match(workflow, /node scripts\/release\/run-production-observability-validation\.mjs/);
  assert.equal(existsSync(authenticatedSmokePath), true);
  assert.equal(existsSync(productionObservabilityPath), true);
});

test('runtime closeout maps protected aliases into every canonical release input', () => {
  const requiredEnvKeys = [
    'RELEASE_TARGET',
    'RELEASE_COMMIT_SHA',
    'RELEASE_BUILD_SHA',
    'RELEASE_RUN_OBSERVABILITY_SMOKE',
    'RELEASE_PRODUCTION_URL',
    'RELEASE_DEPLOYMENT_URL',
    'HEALTHCHECK_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TEST_USER_A_EMAIL',
    'TEST_USER_A_PASSWORD',
    'TEST_USER_B_EMAIL',
    'TEST_USER_B_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_GROWTH_MONTHLY',
    'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_AUTH_TOKEN',
    'SENTRY_DSN',
    'SENTRY_ORG',
    'SENTRY_PROJECT',
    'RELEASE_ROLLBACK_TARGET',
    'RELEASE_ROLLBACK_TARGET_SHA',
    'RELEASE_ROLLBACK_TARGET_VALIDATED',
  ];

  for (const key of requiredEnvKeys) {
    assert.match(workflow, new RegExp(`^\\s{6}${key}:`, 'm'), `${key} must be wired in protected closeout env`);
  }

  assert.match(workflow, /HEALTHCHECK_TOKEN: \$\{\{ secrets\.READINESS_TOKEN \}\}/);
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_URL: \$\{\{ secrets\.SUPABASE_URL \}\}/);
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_ANON_KEY: \$\{\{ secrets\.SUPABASE_ANON_KEY \}\}/);
  assert.match(workflow, /RELEASE_PRODUCTION_URL: \$\{\{ vars\.PRODUCTION_URL \}\}/);
  assert.match(workflow, /RELEASE_RUN_OBSERVABILITY_SMOKE: 'true'/);
});

test('secret-bearing runtime values remain sourced from GitHub secrets', () => {
  const secretMappings = [
    ['HEALTHCHECK_TOKEN', 'READINESS_TOKEN'],
    ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    ['TEST_USER_A_EMAIL', 'TEST_USER_A_EMAIL'],
    ['TEST_USER_A_PASSWORD', 'TEST_USER_A_PASSWORD'],
    ['TEST_USER_B_EMAIL', 'TEST_USER_B_EMAIL'],
    ['TEST_USER_B_PASSWORD', 'TEST_USER_B_PASSWORD'],
    ['STRIPE_SECRET_KEY', 'STRIPE_SECRET_KEY'],
    ['STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_URL'],
    ['UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_TOKEN'],
    ['SENTRY_AUTH_TOKEN', 'SENTRY_AUTH_TOKEN'],
  ];

  for (const [envName, secretName] of secretMappings) {
    assert.match(
      workflow,
      new RegExp(`${envName}: \\$\\{\\{ secrets\\.${secretName} \\}\\}`),
      `${envName} must not be downgraded to a repository variable`,
    );
  }
});

test('authenticated and observability producers write exactly the files the closeout validator consumes', () => {
  const authenticated = read(authenticatedSmokePath);
  const observability = read(productionObservabilityPath);

  assert.match(authenticated, /authenticated-production-smoke\.json/);
  assert.match(observability, /observability-production-validation\.json/);
  assert.match(observability, /observability-smoke-validation\.json/);
  assert.match(observability, /validateObservabilityRuntimeEvidence/);

  assert.match(validator, /\['authenticatedSmoke', 'authenticated-production-smoke\.json'\]/);
  assert.match(validator, /\['observability', 'observability-production-validation\.json'\]/);
});

test('public production final remains the canonical producer for prerequisite runtime evidence', () => {
  for (const filename of [
    'deployment-smoke-validation.json',
    'observability-smoke-validation.json',
    'rollback-dry-run-validation.json',
    'supabase-live-rls-validation.json',
  ]) {
    assert.match(publicFinal, new RegExp(filename.replaceAll('.', '\\.')));
  }

  assert.match(workflow, /Run public production final validation[\s\S]*npm run release:production-final/);
  assert.equal(
    workflow.includes('node scripts/security/run-supabase-live-rls-validation.mjs'),
    false,
    'closeout must not execute a second live RLS mutation pass after Public Production Final already produced it',
  );
});

test('authenticated production evidence contract is fail-closed, form-scoped and secret-minimizing', () => {
  const authenticated = read(authenticatedSmokePath);
  assert.match(authenticated, /\/api\/ready\/release/);
  assert.match(authenticated, /evaluateRuntimeReleaseSha/);
  assert.match(authenticated, /TEST_USER_A_EMAIL/);
  assert.match(authenticated, /TEST_USER_B_EMAIL/);
  assert.match(authenticated, /const passwordForm = page\.locator\('form'\)\.filter/);
  assert.match(authenticated, /passwordForm\.getByLabel\(\/email\/i\)/);
  assert.match(authenticated, /passwordForm[\s\S]*getByRole\('button'/);
  assert.match(authenticated, /canonicalDashboardPath/);
  assert.match(authenticated, /dashboard\/organizations/);
  assert.match(authenticated, /dashboardStatus === 200/);
  assert.match(authenticated, /credentialsStored: false/);
  assert.match(authenticated, /cookiesStored: false/);
  assert.match(authenticated, /accessTokensStored: false/);
  assert.match(authenticated, /screenshotsStored: false/);
});
