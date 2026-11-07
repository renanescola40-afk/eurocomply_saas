import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const configPath = process.env.QAT15_CIRCLECI_CONFIG ?? new URL('../../.circleci/config.yml', import.meta.url);
const config = fs.readFileSync(configPath, 'utf8');

test('QAT-01 exact-SHA quality job is opt-in and exact-source guarded', () => {
  assert.match(config, /^  run_qat15_missing_checks:\n    type: boolean\n    default: false/m);
  assert.match(config, /^  qat15_source_branch:\n    type: string\n    default: "none"/m);
  assert.match(config, /^  qat15_source_sha:\n    type: string\n    default: "none"/m);
  assert.match(config, /qat15-missing-checks-manual:[\s\S]*?when: << pipeline\.parameters\.run_qat15_missing_checks >>[\s\S]*?only:[\s\S]*?ci\/qat15-exact-sha-quality-20261107/);
  assert.match(config, /qat15-missing-checks:\n[\s\S]*?test "\$\(git rev-parse HEAD\)" = "\$\{CIRCLE_SHA1/);
  assert.match(config, /TARGET_QAT15_SHA/);
  assert.match(config, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(config, /git ls-remote --exit-code origin "refs\/heads\/\$TARGET_QAT15_BRANCH"/);
  assert.match(config, /test "\$remote_sha" = "\$TARGET_QAT15_SHA"/);
  assert.match(config, /test "\$\(git rev-parse HEAD\)" = "\$TARGET_QAT15_SHA"/);
  assert.match(config, /provider credential/i);
  assert.match(config, /productionWrites.*0/);
});

test('QAT-01 job runs only missing checks and does not repeat Vitest', () => {
  const job = config.match(/  qat15-missing-checks:\n([\s\S]*?)(?=\n  [a-z0-9-]+:\n|\nworkflows:)/)?.[0] ?? '';
  assert.ok(job.length > 0, 'QAT-01 job exists');
  assert.match(job, /scripts\/security\/run-security-ci-without-audit\.mjs/);
  assert.match(job, /security:npm-audit:all/);
  assert.match(job, /npm run build/);
  assert.match(job, /npm run quality:routes/);
  assert.match(job, /grep -Ev.*CIRCLE_OIDC_TOKEN/);
  assert.match(job, /"circleOidcTokenUsed":false/);
  assert.match(job, /"privilegedProviderCredentialsPresent":false/);
  assert.doesNotMatch(job, /\\$CIRCLE_OIDC_TOKEN|printenv CIRCLE_OIDC_TOKEN/);
  assert.match(job, /gitleaks/);
  assert.match(job, /store_artifacts/);
  assert.doesNotMatch(job, /npm run test|vitest/i);
  const environment = job.match(/    environment:\\n((?:      .*\\n)+)/)?.[0] ?? '';
  assert.doesNotMatch(environment, /DATABASE_URL|DIRECT_URL|SUPABASE_ACCESS_TOKEN|STRIPE_SECRET_KEY|VERCEL_TOKEN|RESEND_API_KEY|SENTRY_AUTH_TOKEN/i);
  assert.doesNotMatch(job, /npm run deploy|vercel .*deploy|stripe (?:live|charges?)/i);
});
