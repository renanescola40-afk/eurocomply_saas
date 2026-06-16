#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const evidenceDir = 'docs/evidence/phase1';
const logFile = `${evidenceDir}/dev-smoke.log`;
const port = process.env.PORT ?? '3000';
const url = process.env.PHASE1_SMOKE_URL ?? `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.PHASE1_SMOKE_TIMEOUT_MS ?? 30000);

mkdirSync(evidenceDir, { recursive: true });

const startedAt = new Date().toISOString();
let output = `# Phase 1 local smoke test\nStarted: ${startedAt}\nURL: ${url}\n\n`;

const child = spawn('npm', ['run', 'dev'], {
  env: { ...process.env, PORT: port },
  shell: process.platform === 'win32',
});

child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});

child.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttp() {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      output += `\nSmoke status: ${response.status}\n`;

      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch (error) {
      output += `\nSmoke retry: ${error instanceof Error ? error.message : String(error)}\n`;
    }

    await sleep(1000);
  }

  return false;
}

try {
  const ok = await waitForHttp();
  child.kill('SIGTERM');

  output += `Finished: ${new Date().toISOString()}\n`;
  output += `Result: ${ok ? 'passed' : 'failed'}\n`;
  writeFileSync(logFile, output);

  if (!ok) {
    console.error(`Phase 1 smoke test failed. See ${logFile}`);
    process.exit(1);
  }

  console.log(`Phase 1 smoke evidence written to ${logFile}`);
} catch (error) {
  child.kill('SIGTERM');
  output += `\nUnexpected error: ${error instanceof Error ? error.stack : String(error)}\n`;
  output += `Finished: ${new Date().toISOString()}\nResult: failed\n`;
  writeFileSync(logFile, output);
  console.error(`Phase 1 smoke test failed. See ${logFile}`);
  process.exit(1);
}
