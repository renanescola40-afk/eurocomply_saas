#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const outputDir = process.env.RELEASE_VALIDATION_DIR || 'release-validation/public-production';
const logDir = join(outputDir, 'logs');
const evidenceDir = join('docs', 'security', 'evidence', 'runtime');
const evidencePath = join(evidenceDir, 'production-final-validation.json');
const releaseTarget = process.env.RELEASE_TARGET || 'production';
const maxBuffer = 128 * 1024 * 1024;

const requiredEvidence = [
  'docs/security/evidence/runtime/deployment-smoke-validation.json',
  'docs/security/evidence/runtime/rollback-dry-run-validation.json',
];

const commands = [
  { slug: '00-npm-ci', label: 'npm ci', command: 'npm', args: ['ci'], critical: true },
  { slug: '01-lint', label: 'npm run lint', command: 'npm', args: ['run', 'lint'], critical: true },
  { slug: '02-typecheck', label: 'npm run typecheck', command: 'npm', args: ['run', 'typecheck'], critical: true },
  { slug: '03-test', label: 'npm run test', command: 'npm', args: ['run', 'test'], critical: true },
  {
    slug: '04-playwright-install',
    label: 'npx playwright install --with-deps',
    command: 'npx',
    args: ['playwright', 'install', '--with-deps'],
    critical: true,
    prerequisiteFor: 'npm run test:e2e',
  },
  { slug: '05-test-e2e', label: 'npm run test:e2e', command: 'npm', args: ['run', 'test:e2e'], critical: true },
  { slug: '06-build', label: 'npm run build', command: 'npm', args: ['run', 'build'], critical: true },
  { slug: '07-security-ci', label: 'npm run security:ci', command: 'npm', args: ['run', 'security:ci'], critical: true },
  { slug: '08-release-smoke', label: 'npm run release:deployment-smoke', command: 'npm', args: ['run', 'release:deployment-smoke'], critical: true },
  { slug: '09-release-rollback-dry-run', label: 'npm run release:rollback:dry-run', command: 'npm', args: ['run', 'release:rollback:dry-run'], critical: true },
  { slug: '10-release-readiness', label: 'npm run release:readiness', command: 'npm', args: ['run', 'release:readiness'], critical: true },
];

mkdirSync(logDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function githubRunUrl() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!repository || !runId) return null;
  return `https://github.com/${repository}/actions/runs/${runId}`;
}

function commandLine(step) {
  return [step.command, ...step.args].join(' ');
}

function readEvidenceOutcome(path) {
  if (!existsSync(path)) {
    return { path, present: false, status: 'Open', outcome: 'missing' };
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      path,
      present: true,
      status: parsed.status || 'Open',
      outcome: parsed.outcome || 'unknown',
      generatedAt: parsed.generatedAt || null,
    };
  } catch {
    return { path, present: true, status: 'Open', outcome: 'invalid_json' };
  }
}

function runCommand(step) {
  const startedAt = now();
  const logPath = join(logDir, `${step.slug}.log`);
  const header = [
    `# ${step.label}`,
    `Command: ${commandLine(step)}`,
    `Started: ${startedAt}`,
    `Release target: ${releaseTarget}`,
    step.prerequisiteFor ? `Prerequisite for: ${step.prerequisiteFor}` : null,
    '',
  ].filter(Boolean).join('\n');

  process.stdout.write(`${header}\n`);

  const result = spawnSync(step.command, step.args, {
    encoding: 'utf8',
    maxBuffer,
    env: {
      ...process.env,
      CI: 'true',
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1',
      RELEASE_TARGET: releaseTarget,
      PUBLIC_PRODUCTION_RELEASE_IN_PROGRESS: 'true',
    },
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const finishedAt = now();
  const exitStatus = typeof result.status === 'number' ? result.status : 1;
  const diagnostics = result.error ? `\nRunner error: ${result.error.message}\n` : '';
  const footer = [
    '',
    diagnostics.trim() ? diagnostics.trim() : null,
    `Finished: ${finishedAt}`,
    `Exit status: ${exitStatus}`,
    result.signal ? `Signal: ${result.signal}` : null,
    '',
  ].filter(Boolean).join('\n');

  process.stdout.write(`${footer}\n`);
  writeFileSync(logPath, `${header}\n${stdout}${stderr}${footer}\n`);

  return {
    command: step.label,
    critical: step.critical,
    startedAt,
    finishedAt,
    exitStatus,
    exitCode: exitStatus,
    passed: exitStatus === 0,
    result: exitStatus === 0 ? 'passed' : 'failed',
    log: logPath,
    prerequisiteFor: step.prerequisiteFor || null,
  };
}

const results = commands.map((command) => runCommand(command));
const runtimeEvidence = requiredEvidence.map(readEvidenceOutcome);
const commandFailures = results.filter((result) => result.critical && !result.passed).map((result) => result.command);
const evidenceFailures = runtimeEvidence
  .filter((item) => !(item.present && item.status === 'Complete' && item.outcome === 'passed'))
  .map((item) => item.path);
const promotedCommit = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null;
const buildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
const metadataFailures = [];

if (!promotedCommit) metadataFailures.push('Last validated commit SHA is missing.');
if (!buildSha) metadataFailures.push('Build SHA is missing.');

const failures = [...commandFailures, ...evidenceFailures, ...metadataFailures];
const overallResult = failures.length === 0 ? 'passed' : 'failed';
const generatedAt = now();

const summary = {
  generatedAt,
  repository: process.env.GITHUB_REPOSITORY || null,
  workflow: process.env.GITHUB_WORKFLOW || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runUrl: githubRunUrl(),
  commitSha: promotedCommit,
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
  publicReadinessScope: {
    excludesEnterpriseExternalReview: false,
    note: 'Public production readiness delegates release gates to npm run release:readiness so the shared Go/No-Go contract remains canonical.',
  },
  recursionGuard: {
    npmRunReleaseDoesNotInvokeItself: true,
    note: 'The release:production-final entrypoint expands the requested production launch sequence into concrete commands and delegates final release gates to release:readiness to avoid recursive npm run loops.',
  },
};

writeFileSync(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const markdown = [
  '# Public production release validation summary',
  '',
  `- Generated at: ${summary.generatedAt}`,
  `- Repository: ${summary.repository || 'local/not in GitHub Actions'}`,
  `- Run URL: ${summary.runUrl || 'local/not in GitHub Actions'}`,
  `- Commit SHA: ${summary.commitSha || 'missing'}`,
  `- Build SHA: ${summary.buildSha || 'missing'}`,
  `- Ref: ${summary.refName || 'local/not in GitHub Actions'}`,
  `- Release target: ${summary.releaseTarget}`,
  `- Overall result: **${summary.overallResult}**`,
  `- Public readiness excludes enterprise external review: **${summary.publicReadinessScope.excludesEnterpriseExternalReview ? 'yes' : 'no'}**`,
  '',
  '| Command | Critical | Result | Exit status | Log |',
  '| --- | --- | --- | --- | --- |',
  ...summary.commands.map((command) => `| \`${command.command}\` | ${command.critical ? 'yes' : 'no'} | ${command.result} | ${command.exitStatus} | \`${command.log}\` |`),
  '',
  '| Runtime evidence | Present | Status | Outcome |',
  '| --- | --- | --- | --- |',
  ...summary.runtimeEvidence.map((item) => `| \`${item.path}\` | ${item.present ? 'yes' : 'no'} | ${item.status} | ${item.outcome} |`),
  '',
].join('\n');

writeFileSync(join(outputDir, 'summary.md'), markdown);

const evidence = {
  evidenceItem: 'production-final-validation',
  status: overallResult === 'passed' ? 'Complete' : 'Open',
  outcome: overallResult,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  releaseTarget,
  summary: overallResult === 'passed'
    ? 'Public production release validation passed with real runtime deployment smoke, rollback dry-run, build metadata, and command evidence.'
    : 'Public production release validation failed; release remains No-Go until every P0 command, runtime evidence file, rollback target, commit SHA, and build SHA passes.',
  redactionConfirmation: 'Redaction confirmed: no token, cookie, authorization header, secret value, or secret environment variable name is written to this evidence file.',
  evidenceLocations: [
    'scripts/release/run-public-production-release.mjs',
    'release-validation/public-production/summary.json',
    'release-validation/public-production/logs/*.log',
    'docs/security/evidence/runtime/deployment-smoke-validation.json',
    'docs/security/evidence/runtime/rollback-dry-run-validation.json',
    evidencePath,
  ],
  controlsVerified: overallResult === 'passed'
    ? [
      'npm ci',
      'lint',
      'typecheck',
      'unit tests',
      'playwright browsers installed before e2e',
      'e2e tests',
      'build',
      'security:ci suite',
      'deployment smoke',
      'rollback dry-run',
      'release readiness gate',
      'commit SHA recorded',
      'build SHA recorded',
    ]
    : [],
  commands: summary.commands,
  runtimeEvidence: summary.runtimeEvidence,
  publicReadinessScope: summary.publicReadinessScope,
  failures: {
    commandFailures,
    evidenceFailures,
    metadataFailures,
  },
  releaseGate: overallResult === 'passed'
    ? 'Public Production Go is allowed only if the checklist and approval record also select Go for the same commit.'
    : 'Public Production Go is blocked. Keep No-Go until this evidence is Complete/passed.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
  },
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (overallResult !== 'passed') {
  console.error('Public production release validation failed. See release-validation/public-production/summary.json and docs/security/evidence/runtime/production-final-validation.json.');
  process.exit(1);
}
