#!/usr/bin/env node
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const outputDir = process.env.RELEASE_VALIDATION_DIR || 'release-validation';
const logDir = join(outputDir, 'logs');
const releaseTarget = process.env.RELEASE_TARGET || 'production';

mkdirSync(logDir, { recursive: true });

const commands = [
  { slug: '00-npm-ci', label: 'npm ci', command: 'npm ci', requested: true },
  { slug: '01-lint', label: 'npm run lint', command: 'npm run lint', requested: true },
  { slug: '02-typecheck', label: 'npm run typecheck', command: 'npm run typecheck', requested: true },
  { slug: '03-test', label: 'npm run test', command: 'npm run test', requested: true },
  {
    slug: '04-playwright-install',
    label: 'Playwright browser dependency install',
    command: 'npx playwright install --with-deps',
    requested: false,
    prerequisiteFor: 'npm run test:e2e',
  },
  { slug: '05-test-e2e', label: 'npm run test:e2e', command: 'npm run test:e2e', requested: true },
  { slug: '06-build', label: 'npm run build', command: 'npm run build', requested: true },
  { slug: '07-security-ci', label: 'npm run security:ci', command: 'npm run security:ci', requested: true },
  { slug: '08-release-readiness', label: 'npm run release:readiness', command: 'npm run release:readiness', requested: true },
];

function now() {
  return new Date().toISOString();
}

function githubRunUrl() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!repository || !runId) return null;
  return `https://github.com/${repository}/actions/runs/${runId}`;
}

function runCommand(step) {
  return new Promise((resolve) => {
    const startedAt = now();
    const logPath = join(logDir, `${step.slug}.log`);
    const stream = createWriteStream(logPath, { flags: 'w' });

    const header = [
      `# ${step.label}`,
      `Command: ${step.command}`,
      `Started: ${startedAt}`,
      `Release target: ${releaseTarget}`,
      '',
    ].join('\n');

    process.stdout.write(`${header}\n`);
    stream.write(`${header}\n`);

    const child = spawn(step.command, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CI: 'true',
        NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1',
        RELEASE_TARGET: releaseTarget,
      },
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      stream.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      stream.write(chunk);
    });

    child.on('error', (error) => {
      const message = `\nRunner error: ${error instanceof Error ? error.message : String(error)}\n`;
      process.stderr.write(message);
      stream.write(message);
    });

    child.on('close', (status, signal) => {
      const finishedAt = now();
      const normalizedStatus = typeof status === 'number' ? status : 1;
      const footer = [
        '',
        `Finished: ${finishedAt}`,
        `Exit status: ${normalizedStatus}`,
        signal ? `Signal: ${signal}` : null,
        '',
      ].filter(Boolean).join('\n');

      process.stdout.write(`${footer}\n`);
      stream.write(`${footer}\n`);
      stream.end();

      resolve({
        ...step,
        startedAt,
        finishedAt,
        exitStatus: normalizedStatus,
        result: normalizedStatus === 0 ? 'passed' : 'failed',
        log: logPath,
      });
    });
  });
}

const results = [];
for (const command of commands) {
  results.push(await runCommand(command));
}

const requestedResults = results.filter((result) => result.requested);
const prerequisiteFailures = results.filter((result) => !result.requested && result.exitStatus !== 0);
const requestedFailures = requestedResults.filter((result) => result.exitStatus !== 0);
const overallResult = requestedFailures.length === 0 && prerequisiteFailures.length === 0 ? 'passed' : 'failed';

const summary = {
  generatedAt: now(),
  repository: process.env.GITHUB_REPOSITORY || null,
  workflow: process.env.GITHUB_WORKFLOW || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runUrl: githubRunUrl(),
  commitSha: process.env.GITHUB_SHA || null,
  refName: process.env.GITHUB_REF_NAME || null,
  actor: process.env.GITHUB_ACTOR || null,
  eventName: process.env.GITHUB_EVENT_NAME || null,
  releaseTarget,
  overallResult,
  requestedCommandFailures: requestedFailures.map((result) => result.label),
  prerequisiteFailures: prerequisiteFailures.map((result) => result.label),
  commands: results.map((result) => ({
    command: result.label,
    requested: result.requested,
    prerequisiteFor: result.prerequisiteFor || null,
    exitStatus: result.exitStatus,
    result: result.result,
    log: result.log,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
  })),
};

writeFileSync(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const markdown = [
  '# Final release validation summary',
  '',
  `- Generated at: ${summary.generatedAt}`,
  `- Repository: ${summary.repository || 'local/not in GitHub Actions'}`,
  `- Run URL: ${summary.runUrl || 'local/not in GitHub Actions'}`,
  `- Commit SHA: ${summary.commitSha || 'local/not in GitHub Actions'}`,
  `- Ref: ${summary.refName || 'local/not in GitHub Actions'}`,
  `- Release target: ${summary.releaseTarget}`,
  `- Overall result: **${summary.overallResult}**`,
  '',
  '| Command | Requested | Result | Exit status | Log |',
  '| --- | --- | --- | --- | --- |',
  ...summary.commands.map((command) => `| \`${command.command}\` | ${command.requested ? 'yes' : 'no'} | ${command.result} | ${command.exitStatus} | \`${command.log}\` |`),
  '',
].join('\n');

writeFileSync(join(outputDir, 'summary.md'), markdown);

if (overallResult !== 'passed') {
  console.error('Final release validation failed. See release-validation/summary.json and release-validation/logs/*.log.');
  process.exit(1);
}

console.log('Final release validation passed.');
