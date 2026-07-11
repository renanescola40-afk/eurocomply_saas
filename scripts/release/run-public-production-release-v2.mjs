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
  ['04-build-for-production-like-e2e', 'npm run build', 'npm', ['run', 'build']],
  ['05-playwright-install', 'npx playwright install --with-deps', 'npx', ['playwright', 'install', '--with-deps']],
  ['06-test-e2e-production-like', 'npm run test:e2e', 'npm', ['run', 'test:e2e']],
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

function disableLiveSupabaseRuntimeChecks(env) {
  env.SUPABASE_ACCESS_TOKEN = '';
  env.SUPABASE_DB_URL = '';
  env.DATABASE_URL = '';
  env.POSTGRES_URL = '';
  env.POSTGRES_PRISMA_URL = '';
  env.POSTGRES_URL_NON_POOLING = '';
  env.SUPABASE_POOLER_URL = '';
  env.SUPABASE_DIRECT_URL = '';
}

function buildStepEnv(step) {
  const isE2eStep = step.slug.includes('test-e2e');
  const isUnitTestStep = step.slug === '03-test';
  const isStaticSecurityCiStep = step.slug === '07-security-ci';
  const env = {
    ...process.env,
    CI: 'true',
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1',
    RELEASE_TARGET: releaseTarget,
    RISCK_COMPLY_ENTERPRISE_RELEASE: 'true',
    PUBLIC_PRODUCTION_RELEASE_IN_PROGRESS: 'true',
    FINAL_VALIDATION_IN_PROGRESS: 'true',
    ...(isE2eStep && !process.env.E2E_BASE_URL ? { PLAYWRIGHT_USE_PRODUCTION_SERVER: 'true' } : {}),
  };

  if (isUnitTestStep || isStaticSecurityCiStep) {
    env.RELEASE_TARGET = isUnitTestStep ? process.env.UNIT_TEST_RELEASE_TARGET || 'test' : 'static-ci';
    env.RISCK_COMPLY_ENTERPRISE_RELEASE = '';
    env.EUROCOMPLY_ENTERPRISE_RELEASE = '';
    env.PUBLIC_PRODUCTION_RELEASE_IN_PROGRESS = '';
    env.FINAL_VALIDATION_IN_PROGRESS = '';
  }

  if (isStaticSecurityCiStep) {
    disableLiveSupabaseRuntimeChecks(env);
  }

  return env;
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
    '',
  ].join('\n');

  const result = spawnSync(step.command, step.args, {
    env: buildStepEnv(step),
    encoding: 'utf8',
    maxBuffer,
    shell: false,
  });

  const finishedAt = now();
  const output = [
    header,
    result.stdout || '',
    result.stderr || '',
    `Finished: ${finishedAt}`,
    `Exit status: ${result.status ?? 'null'}`,
  ].join('\n');
  writeFileSync(log, output);

  const passed = result.status === 0;
  return {
    command: step.label,
    critical: step.critical,
    startedAt,
    finishedAt,
    exitStatus: result.status,
    exitCode: result.status,
    passed,
    result: passed ? 'passed' : 'failed',
    log,
  };
}

const startedAt = now();
const commandResults = commands.map(runStep);
const finishedAt = now();
const runtimeEvidence = Object.fromEntries(requiredEvidence.map((path) => [path, readEvidence(path)]));
const commandFailures = commandResults.filter((item) => item.critical && !item.passed);
const evidenceFailures = Object.values(runtimeEvidence).filter((item) => item.status !== 'Complete' || item.outcome !== 'passed');

const metadataFailures = [];
if (!process.env.RELEASE_COMMIT_SHA && !process.env.GITHUB_SHA) metadataFailures.push('Missing release commit SHA.');
if (!process.env.RELEASE_BUILD_SHA && !process.env.NEXT_PUBLIC_BUILD_SHA && !process.env.GITHUB_SHA) metadataFailures.push('Missing release build SHA.');
if (!process.env.RELEASE_ROLLBACK_TARGET && !process.env.LAST_KNOWN_GOOD_DEPLOYMENT_URL) metadataFailures.push('Missing rollback target.');

const passed = commandFailures.length === 0 && evidenceFailures.length === 0 && metadataFailures.length === 0;
const evidence = {
  schema: 'risck-comply.production-final-validation.v2',
  evidenceItem: 'production-final-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: finishedAt,
  reviewedAt: finishedAt,
  reviewer: 'RISCK COMPLY enterprise release automation',
  runner: 'RISCK COMPLY enterprise release automation',
  releaseTarget,
  commitSha: process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || null,
  buildSha: process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.GITHUB_SHA || null,
  startedAt,
  finishedAt,
  summary: passed
    ? 'Enterprise production release validation passed for the promoted commit and target runtime.'
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
  controlsVerified: passed
    ? [
      'deterministic-install',
      'lint',
      'typecheck',
      'unit-tests',
      'production-like-e2e',
      'security-ci',
      'supabase-live-rls',
      'deployment-smoke',
      'observability-smoke',
      'rollback-dry-run',
      'enterprise-runtime-evidence',
      'final-go-no-go',
    ]
    : [],
  commands: commandResults,
  runtimeEvidence,
  commandFailures,
  evidenceFailures,
  metadataFailures,
  releaseGate: passed
    ? 'Go candidate: final production validation passed. Confirm release-go-no-go finalDecision before announcing.'
    : 'No-Go: final production validation failed.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
    rawUrlsStored: false,
  },
};

const summary = {
  generatedAt: finishedAt,
  repository: process.env.GITHUB_REPOSITORY || null,
  workflow: process.env.GITHUB_WORKFLOW || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runUrl: runUrl(),
  commitSha: evidence.commitSha,
  buildSha: evidence.buildSha,
  refName: process.env.GITHUB_REF_NAME || null,
  actor: process.env.GITHUB_ACTOR || null,
  eventName: process.env.GITHUB_EVENT_NAME || null,
  releaseTarget,
  overallResult: passed ? 'passed' : 'failed',
  commandFailures: commandFailures.map((item) => ({ command: item.command, log: item.log, exitStatus: item.exitStatus })),
  evidenceFailures,
  metadataFailures,
  commands: commandResults,
  runtimeEvidence,
  enterpriseReadinessScope: {
    staticSecurityCiIsolated: true,
    staticSecurityCiSkipsLiveSupabaseRuntimeConnections: true,
    liveRuntimeChecksRunInDedicatedSteps: true,
    supabaseLiveRlsCommand: 'npm run security:rls:live',
    deploymentSmokeCommand: 'npm run release:deployment-smoke',
  },
  recursionGuard: {
    productionFinalDoesNotCallEnterpriseReadiness: true,
  },
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(finalRunnerEvidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(join(outputDir, 'summary.md'), [
  '# RISCK COMPLY Enterprise Production Final Gate',
  '',
  `- Result: ${passed ? 'passed' : 'failed'}`,
  `- Generated: ${finishedAt}`,
  `- Commit: ${evidence.commitSha || 'unknown'}`,
  `- Build: ${evidence.buildSha || 'unknown'}`,
  `- Release target: ${releaseTarget}`,
  '',
  '## Command failures',
  ...(commandFailures.length ? commandFailures.map((item) => `- ${item.command} (${item.log})`) : ['- none']),
  '',
  '## Evidence failures',
  ...(evidenceFailures.length ? evidenceFailures.map((item) => `- ${item.path}: status=${item.status}, outcome=${item.outcome}`) : ['- none']),
  '',
  '## Metadata failures',
  ...(metadataFailures.length ? metadataFailures.map((item) => `- ${item}`) : ['- none']),
  '',
].join('\n'));

console.log(`Wrote ${evidencePath}`);
console.log(`Wrote ${finalRunnerEvidencePath}`);
console.log(`Wrote ${join(outputDir, 'summary.json')}`);

if (!passed) {
  console.error('Enterprise production final gate failed.');
  process.exit(1);
}

console.log('Enterprise production final gate passed.');
