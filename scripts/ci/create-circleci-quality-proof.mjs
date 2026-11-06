#!/usr/bin/env node
// Quality-job completion record only. CircleCI must execute this as an on-success
// step after every listed command; this is not independent Enterprise acceptance.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function makeQualityProof({ env, gitSha, timestamp }) {
  if (env.CIRCLECI !== 'true' || env.CIRCLE_JOB !== 'github-actions-recovery-quality') {
    throw new Error('quality_circleci_runner_required');
  }
  if (!/^[a-f0-9]{40}$/.test(gitSha || '') || gitSha !== env.CIRCLE_SHA1) {
    throw new Error('quality_exact_sha_required');
  }
  if (!['fix/actions-p0-runner-storm-20261102',
    'ci/circleci-gh-actions-one-shot-20261102',
    'integration/enterprise-unified-candidate-20261102',
    'fix/onboarding-explicit-plan-boundary-test-20261105'].includes(env.CIRCLE_BRANCH)) {
    throw new Error('quality_branch_not_allowed');
  }
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'VERCEL_TOKEN', 'DATABASE_URL',
    'DIRECT_URL', 'RESEND_API_KEY', 'SENTRY_AUTH_TOKEN', 'QA_DB_PASSWORD', 'PGPASSWORD']) {
    if (env[key]) throw new Error('quality_privileged_variable_forbidden:' + key);
  }
  const buildNumber = Number(env.CIRCLE_BUILD_NUM);
  if (!Number.isSafeInteger(buildNumber) || buildNumber < 1
    || !/^[a-f0-9-]{36}$/i.test(env.CIRCLE_WORKFLOW_ID || '')) {
    throw new Error('quality_provider_identity_required');
  }
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) throw new Error('quality_timestamp_required');
  return {
    schema: 'risck-comply.circleci-quality-completion.v1',
    generatedAt: timestamp,
    sourceCommitSha: gitSha,
    circleci: { job: env.CIRCLE_JOB, branch: env.CIRCLE_BRANCH,
      buildNumber, workflowId: env.CIRCLE_WORKFLOW_ID },
    result: 'SOURCE_QUALITY_COMPLETED',
    completedCommands: [
      'npm ci --ignore-scripts --no-audit --no-fund',
      'npm run security:package-lock',
      'node scripts/security/run-security-ci-without-audit.mjs',
      'npm run lint', 'npm run typecheck', 'npm run test',
      'npm run build', 'npm run quality:routes',
    ],
    proofBoundary: 'On-success job completion record; validate against provider job steps. Does not replace full security, authenticated QA, migration replay or independent review.',
    formalAcceptance: 'NOT_GRANTED',
    authenticatedRuntime: 'NOT_TESTED',
    productionDeployment: 'NOT_TESTED',
    mandatoryGithubChecks: 'NOT_SUBSTITUTED',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const proof = makeQualityProof({ env: process.env, gitSha, timestamp: new Date().toISOString() });
  const output = 'artifacts/circleci-quality/quality-completion.json';
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ result: proof.result, sha: gitSha, formalAcceptance: proof.formalAcceptance }));
}
