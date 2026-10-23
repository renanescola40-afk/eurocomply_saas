#!/usr/bin/env node
/**
 * Source-only CircleCI proof. This does not authorize production deployment.
 * Only the last successful step of validar-risck is allowed to emit it.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const FILE = fileURLToPath(import.meta.url);

export function makeSourceOnlyProof({ env, gitSha, timestamp }) {
  if (env.CIRCLECI !== 'true') throw new Error('circleci_runner_required');
  if (env.CIRCLE_JOB !== 'validar-risck') throw new Error('validar_risck_job_required');
  if (!FULL_SHA.test(gitSha || '') || !FULL_SHA.test(env.CIRCLE_SHA1 || '')) {
    throw new Error('exact_sha_required');
  }
  if (gitSha !== env.CIRCLE_SHA1) throw new Error('checkout_sha_mismatch');
  const branch = env.CIRCLE_BRANCH || '';
  if (!(branch === 'main' || /^ci\/verify-[A-Za-z0-9._/-]+$/.test(branch) || branch === 'fix/p0-forward-manifest-v44-20261019' || branch === 'fix/circleci-source-evidence-v17-20261021')) {
    throw new Error('disallowed_circleci_branch');
  }
  for (const name of [
    'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN', 'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 'VERCEL_TOKEN', 'DATABASE_URL', 'DIRECT_URL',
    'RESEND_API_KEY', 'SENTRY_AUTH_TOKEN',
  ]) {
    if (env[name]) throw new Error('privileged_ci_variable_forbidden:' + name);
  }
  const buildNum = Number(env.CIRCLE_BUILD_NUM);
  if (!Number.isSafeInteger(buildNum) || buildNum < 1) throw new Error('circleci_build_number_required');
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) throw new Error('invalid_proof_timestamp');
  return {
    schema: 'risck-comply.circleci-source-only-proof.v1',
    generatedAt: timestamp,
    sourceCommitSha: gitSha,
    circleci: {
      provider: 'CircleCI',
      job: 'validar-risck',
      branch,
      buildNumber: buildNum,
    },
    sourceOnly: {
      result: 'SOURCE_ONLY_CHECKS_COMPLETED',
      prerequisite: 'Emitted only after successful lint, typecheck, unit, security, lockfile, Next.js build, and route-validation steps in this job',
      includes: [
        'npm run security:package-lock',
        'scripts/security/check-ci-required-checks-validation.mjs',
        'npm run lint',
        'npm run typecheck',
        'npm run test',
        'node --test P0 PostgreSQL source contracts',
        'ISO/SOC2 source contracts',
        'scripts/security/run-security-ci-without-audit.mjs',
        'npm run security:npm-audit:all',
        'npm run build',
        'npm run quality:routes',
      ],
    },
    enterpriseRelease: {
      accepted: false,
      decision: 'NO_GO',
      productionDeployment: 'NOT_TESTED',
      authenticatedTenantIsolation: 'NOT_TESTED',
      independentReview: 'NOT_TESTED',
      providerRuntime: 'NOT_TESTED',
      externalAssurance: 'NOT_TESTED',
      mandatoryGithubActions: 'NOT_SUBSTITUTED',
      reason: 'CircleCI source evidence is distinct from final exact-SHA enterprise release acceptance.',
    },
    containsSensitiveValues: false,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === FILE) {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const proof = makeSourceOnlyProof({ env: process.env, gitSha: sha, timestamp: new Date().toISOString() });
  const output = path.resolve('artifacts/circleci-source-validation/source-only-validation.json');
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ proof: 'CIRCLECI_SOURCE_ONLY', sha, result: proof.sourceOnly.result, enterprise: 'NO_GO' }));
}
