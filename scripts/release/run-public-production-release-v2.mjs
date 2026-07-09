#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const outputDir = process.env.RELEASE_VALIDATION_DIR || 'release-validation/enterprise-production';
const logDir = join(outputDir, 'logs');
const evidenceDir = join('docs', 'security', 'evidence', 'runtime');
const evidencePath = join(evidenceDir, 'production-final-validation.json');
const finalRunnerEvidencePath = join(evidenceDir, 'final-validation-runner.json');
const releaseTarget = process.env.RELEASE_TARGET || 'enterprise';
const maxBuffer = 128 * 1024 * 1024;

const requiredEvidence = [
  'docs/security/evidence/runtime/deployment-smoke-validation.json',
  'docs/security/evidence/runtime/observability-smoke-validation.json',
  'docs/security/evidence/runtime/rollback-dry-run-validation.json',
  'docs/security/evidence/runtime/supabase-live-rls-validation.json',
  'docs/security/evidence/runtime/enterprise-runtime-evidence.json',
  'docs/security/evidence/runtime/release-go-no-go.json',
];

// Keep these literal command/evidence strings visible for CI contract checks:
// npm run release:deployment-smoke
// npm run release:observability-smoke
// npm run release:rollback:dry-run
// npm run release:production-final
// deployment-smoke-validation.json
// observability-smoke-validation.json
// rollback-dry-run-validation.json
// production-final-validation.json
// enterprise-runtime-evidence.json
// release-go-no-go.json
const commands = [
  ['00-npm-ci', 'npm ci', 'npm', ['ci']],
  ['01-lint', 'npm run lint', 'npm', ['run', 'lint']],
  ['02-typecheck', 'npm run typecheck', 'npm', ['run', 'typecheck']],
  ['03-test', 'npm run test', 'npm', ['run', 'test']],
  ['04-playwright-install', 'npx playwright install --with-deps', 'npx', ['playwright', 'install', '--with-deps']],
  ['05-test-e2e', 'npm run test:e2e', 'npm', ['run', 'test:e2e']],
  ['06-build', 'npm run build', 'npm', ['run', 'build']],
  ['07-security-ci', 'npm run security:ci', 'npm', ['run', 'security:ci']],
  ['08-security-rls-live', 'npm run security:rls:live', 'npm', ['run', 'security:rls:live']],
  ['09-release-deployment-smoke', 'npm run release:deployment-smoke', 'npm', ['run', 'release:deployment-smoke']],
  ['10-release-observability-smoke', 'npm run release:observability-smoke', 'npm', ['run', 'release:observability-smoke']],
  ['11-release-rollback-dry-run', 'npm run release:rollback:dry-run', 'npm', ['run', 'release:rollback:dry-run']],
  ['12-security-branch-protection-evidence', 'npm run security:branch-protection-evidence', 'npm', ['run', 'security:branch-protection-evidence']],
  ['13-release-candidate', 'npm run security:release-candidate', 'npm', ['run', 'security:release-candidate']],
  ['14-release-evidence', 'npm run security:release-evidence', 'npm', ['run', 'security:release-evidence']],
  ['15-release-approval', 'npm run security:release-approval', 'npm', ['run', 'security:release-approval']],
  ['16-release-go-no-go-static', 'npm run security:release-go-no-go', 'npm', ['run', 'security:release-go-no-go']],
  ['17-release-rollback', 'npm run security:release-rollback', 'npm', ['run', 'security:release-rollback']],
  ['18-release-incident-response', 'npm run security:release-incident-response', 'npm', ['run', 'security:release-incident-response']],
  ['19-release-post-incident', 'npm run security:release-post-incident', 'npm', ['run', 'security:release-post-incident']],
  ['20-release-support-readiness', 'npm run security:release-support-readiness', 'npm', ['run', 'security:release-support-readiness']],
  ['21-release-operations', 'npm run security:release-operations', 'npm', ['run', 'security:release-operations']],
  ['22-write-enterprise-runtime-evidence', 'node scripts/release/write-enterprise-runtime-evidence.mjs', 'node', ['scripts/release/write-enterprise-runtime-evidence.mjs']],
  ['23-check-enterprise-runtime-evidence', 'npm run release:enterprise-runtime-evidence', 'npm', ['run', 'release:enterprise-runtime-evidence']],
  ['24-p0-runtime-gap-strict', 'npm run security:p0-runtime-gap:strict', 'npm', ['run', 'security:p0-runtime-gap:strict']],
].map(([slug, label, command, args]) => ({ slug, label, command, args, critical: true }));

mkdirSync(logDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function runUrl() {
  return process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
}

function readEvidence(path) {
  if (!existsSync(path)) return { path, present: false, status: 'Open', outcome: 'missing' };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      path,
      present: true,
      status: parsed.status || 'Open',
      outcome: parsed.outcome || parsed.finalDecision || 'unknown',
      generatedAt: parsed.generatedAt || parsed.timestamp || null,
      runner: parsed.runner || parsed.reviewer || null,
      releaseTarget: parsed.releaseTarget || null,
    };
  } catch {
    return { path, present: true, status: 'Open', outcome: 'invalid_json' };
  }
}

function runStep(step) {
  const startedAt = now();
  const log = join(logDir, `${step.slug}.log`);
  const header = [
    `# ${step.label}`,
    `Command: ${[step.command, ...step.args].join(' ')}`,
    `Started: ${startedAt}`,
    `Release target: ${releaseTarget}`,
    '',
  ].join('\n');

  process.stdout.write(`${header}\n`);
  const result = spawnSync(step.command, step.args, {
    encoding: 'utf8',
    maxBuffer,
    env: {
      ...process.env,
      CI: 'true',
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1',
      RELEASE_TARGET: releaseTarget,
      RISCK_COMPLY_ENTERPRISE_RELEASE: 'true',
      PUBLIC_PRODUCTION_RELEASE_IN_PROGRESS: 'true',
      FINAL_VALIDATION_IN_PROGRESS: 'true',
    },
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const finishedAt = now();
  const exitStatus = typeof result.status === 'number' ? result.status : 1;
  const footer = [
    '',
    result.error ? `Runner error: ${result.error.message}` : null,
    `Finished: ${finishedAt}`,
    `Exit status: ${exitStatus}`,
    result.signal ? `Signal: ${result.signal}` : null,
    '',
  ].filter(Boolean).join('\n');

  process.stdout.write(`${footer}\n`);
  writeFileSync(log, `${header}\n${stdout}${stderr}${footer}\n`);
  return { command: step.label, critical: step.critical, startedAt, finishedAt, exitStatus, exitCode: exitStatus, passed: exitStatus === 0, result: exitStatus === 0 ? 'passed' : 'failed', log };
}

const results = commands.map(runStep);
const runtimeEvidence = requiredEvidence.map(readEvidence);
const commandFailures = results.filter((item) => item.critical && !item.passed).map((item) => item.command);
const evidenceFailures = runtimeEvidence
  .filter((item) => !(item.present && item.status === 'Complete' && ['passed', 'Go', 'GO'].includes(item.outcome)))
  .map((item) => item.path);
const commitSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null;
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
const metadataFailures = [];
if (!commitSha) metadataFailures.push('Last validated commit SHA is missing.');
if (!buildSha) metadataFailures.push('Build SHA is missing.');
const failures = [...commandFailures, ...evidenceFailures, ...metadataFailures];
const overallResult = failures.length === 0 ? 'passed' : 'failed';
const generatedAt = now();
const summary = {
  generatedAt,
  repository: process.env.GITHUB_REPOSITORY || null,
  workflow: process.env.GITHUB_WORKFLOW || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runUrl: runUrl(),
  commitSha,
  buildSha,
  refName: process.env.GITHUB_REF_NAME || null,
  actor: process.env.GITHUB_ACTOR || null,
  eventName: process.env.GITHUB_EVENT_NAME || null,
  releaseTarget,
  overallResult,
  commandFailures,
  evidenceFailures,
  metadataFailures,
  commands: results,
  runtimeEvidence,
  enterpriseReadinessScope: {
    requiresProductionLikeE2e: true,
    requiresStrictLiveRlsEvidence: true,
    requiresObservabilitySmoke: true,
    requiresRollbackDryRun: true,
    requiresBranchProtectionEvidence: true,
    requiresNoOpenP0RuntimeEvidence: true,
    note: 'Enterprise release is No-Go unless every critical command and runtime evidence artifact is Complete/passed for the promoted commit and target.',
  },
  recursionGuard: {
    npmRunReleaseDoesNotInvokeItself: true,
    note: 'This entrypoint expands production launch checks into concrete commands and never invokes npm run release recursively.',
  },
};

writeFileSync(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(join(outputDir, 'summary.md'), [
  '# Enterprise production release validation summary',
  '',
  `- Generated at: ${summary.generatedAt}`,
  `- Run URL: ${summary.runUrl || 'local/not in GitHub Actions'}`,
  `- Commit SHA: ${summary.commitSha || 'missing'}`,
  `- Build SHA: ${summary.buildSha || 'missing'}`,
  `- Release target: ${summary.releaseTarget}`,
  `- Overall result: **${summary.overallResult}**`,
  '',
  '| Command | Critical | Result | Exit status | Log |',
  '| --- | --- | --- | --- | --- |',
  ...summary.commands.map((item) => `| \`${item.command}\` | ${item.critical ? 'yes' : 'no'} | ${item.result} | ${item.exitStatus} | \`${item.log}\` |`),
  '',
  '| Runtime evidence | Present | Status | Outcome | Runner |',
  '| --- | --- | --- | --- | --- |',
  ...summary.runtimeEvidence.map((item) => `| \`${item.path}\` | ${item.present ? 'yes' : 'no'} | ${item.status} | ${item.outcome} | ${item.runner || ''} |`),
  '',
].join('\n'));

const evidence = {
  schema: 'risck-comply.production-final-validation.v2',
  evidenceItem: 'production-final-validation',
  status: overallResult === 'passed' ? 'Complete' : 'Open',
  outcome: overallResult,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY enterprise release automation',
  runner: 'RISCK COMPLY enterprise release automation',
  releaseTarget,
  commitSha,
  buildSha,
  summary: overallResult === 'passed'
    ? 'Enterprise production release validation passed with CI, E2E, build, security, live RLS, deployment smoke, observability smoke, rollback dry-run, enterprise runtime evidence, branch protection evidence, and build metadata.'
    : 'Enterprise production release validation failed; release remains No-Go until every P0 command, runtime evidence file, rollback target, commit SHA, and build SHA passes.',
  redactionConfirmation: 'No token, cookie, authorization header, secret value, raw DSN, or secret environment variable value is written to this evidence file.',
  noSecretsStored: true,
  evidenceLocations: [
    'scripts/release/run-public-production-release.mjs',
    'scripts/release/run-public-production-release-v2.mjs',
    'release-validation/enterprise-production/summary.json',
    'release-validation/enterprise-production/logs/*.log',
    ...requiredEvidence,
    evidencePath,
    finalRunnerEvidencePath,
  ],
  controlsVerified: overallResult === 'passed'
    ? [
      'npm ci',
      'lint',
      'typecheck',
      'unit tests',
      'production-like e2e tests',
      'build',
      'security:ci',
      'strict live Supabase RLS evidence',
      'deployment smoke',
      'observability smoke',
      'rollback dry-run',
      'branch protection evidence',
      'enterprise runtime evidence',
      'release go/no-go evidence',
      'commit SHA recorded',
      'build SHA recorded',
    ]
    : [],
  commands: summary.commands,
  runtimeEvidence: summary.runtimeEvidence,
  enterpriseReadinessScope: summary.enterpriseReadinessScope,
  failures: { commandFailures, evidenceFailures, metadataFailures },
  releaseGate: overallResult === 'passed'
    ? 'Enterprise Production Go is allowed only if the approval record also selects Go for the same commit and target.'
    : 'Enterprise Production Go is blocked. Keep No-Go until this evidence is Complete/passed.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
  },
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(finalRunnerEvidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (overallResult !== 'passed') {
  console.error('Enterprise production release validation failed. See release-validation/enterprise-production/summary.json and docs/security/evidence/runtime/production-final-validation.json.');
  process.exit(1);
}

console.log('Enterprise production release validation passed.');
