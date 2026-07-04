#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const startedAt = new Date().toISOString();
const outputDir = join('release-validation', 'local-bootstrap');
const summaryPath = join(outputDir, 'summary.json');
const logPath = join(outputDir, 'bootstrap.log');
const maxBuffer = 64 * 1024 * 1024;

mkdirSync(outputDir, { recursive: true });

const commands = [
  {
    name: 'npm ci',
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['ci'],
    reason: 'Install the exact dependency tree from package-lock.json.',
  },
  {
    name: 'npx playwright install --with-deps chromium',
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['playwright', 'install', '--with-deps', 'chromium'],
    reason: 'Install the browser needed by local route-health and product E2E tests.',
  },
];

function now() {
  return new Date().toISOString();
}

function runStep(step) {
  const started = now();
  const header = `\n# ${step.name}\nReason: ${step.reason}\nStarted: ${started}\n`;
  process.stdout.write(header);

  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CI: process.env.CI || 'true',
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1',
    },
    encoding: 'utf8',
    maxBuffer,
    shell: false,
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const finished = now();
  const exitStatus = typeof result.status === 'number' ? result.status : 1;
  const footer = `Finished: ${finished}\nExit status: ${exitStatus}\n`;
  process.stdout.write(footer);

  return {
    name: step.name,
    reason: step.reason,
    startedAt: started,
    finishedAt: finished,
    exitStatus,
    passed: exitStatus === 0,
    error: result.error ? result.error.message : null,
    output: `${header}${stdout}${stderr}${footer}`,
  };
}

const results = [];
let failed = false;

for (const command of commands) {
  const result = runStep(command);
  results.push(result);
  if (!result.passed) {
    failed = true;
    break;
  }
}

const finishedAt = now();
const summary = {
  generatedAt: finishedAt,
  startedAt,
  finishedAt,
  runner: 'bootstrap-local-validation',
  purpose: 'Prepare Codespaces or a local workstation for deterministic validation without relying on interactive npx prompts.',
  overallResult: failed ? 'failed' : 'passed',
  commands: results.map(({ output, ...result }) => result),
  nextCommands: failed
    ? []
    : [
        'npm run test:e2e',
        'npm run quality:routes:e2e',
        'npm run quality:routes',
        'npm run release:production-final',
      ],
  evidenceIntegrity: {
    containsSensitiveValues: false,
    note: 'This bootstrap writes command metadata only. It must not be used to record environment variable values, tokens, cookies, or secrets.',
  },
};

writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(logPath, `${results.map((result) => result.output).join('\n')}\n`);

if (failed) {
  console.error(`\nLocal validation bootstrap failed. See ${summaryPath} and ${logPath}.`);
  process.exit(1);
}

console.log([
  '',
  'Local validation bootstrap passed.',
  '',
  'Next commands:',
  '  npm run test:e2e',
  '  npm run quality:routes:e2e',
  '  npm run quality:routes',
  '  npm run release:production-final',
  '',
  `Summary written to ${summaryPath}`,
].join('\n'));
