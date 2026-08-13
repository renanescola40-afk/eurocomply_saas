#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const delegate = resolve(currentDir, 'run-reviewed-ephemeral-schema-boundary-v2.mjs');
const MAX_DIAGNOSTIC_LINES = 500;

export function sanitizeEphemeralDiagnostic(value) {
  return String(value ?? '')
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, '[redacted-db-url]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[redacted-jwt]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, '[redacted-supabase-key]')
    .replace(/\b(ANON_KEY|SERVICE_ROLE_KEY|JWT_SECRET|DB_URL|DATABASE_URL|API_KEY|SECRET_KEY|PASSWORD)\s*[=:]\s*[^\s]+/gi, '$1=[redacted]')
    .replace(/(service[_ -]?role|anon)\s+key\s*[:=]\s*[^\s]+/gi, '$1 key=[redacted]');
}

function tailLines(value) {
  const lines = sanitizeEphemeralDiagnostic(value).split(/\r?\n/);
  if (lines.length <= MAX_DIAGNOSTIC_LINES) return lines.join('\n');
  return [
    `[diagnostic truncated: showing last ${MAX_DIAGNOSTIC_LINES} of ${lines.length} lines]`,
    ...lines.slice(-MAX_DIAGNOSTIC_LINES),
  ].join('\n');
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Ephemeral schema diagnostic wrapper is restricted to GitHub Actions');
  }

  const result = spawnSync(process.execPath, [delegate], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  const stdout = tailLines(result.stdout ?? '');
  const stderr = tailLines(result.stderr ?? '');

  if (stdout.trim()) {
    process.stdout.write('::group::Sanitized ephemeral schema stdout\n');
    process.stdout.write(`${stdout}\n`);
    process.stdout.write('::endgroup::\n');
  }
  if (stderr.trim()) {
    process.stderr.write('::group::Sanitized ephemeral schema stderr\n');
    process.stderr.write(`${stderr}\n`);
    process.stderr.write('::endgroup::\n');
  }

  if (result.error) {
    throw new Error(`Unable to execute disposable schema replay: ${result.error.message}`);
  }
  if (result.signal) {
    throw new Error(`Disposable schema replay terminated by signal ${result.signal}`);
  }

  process.exitCode = Number.isInteger(result.status) ? result.status : 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
