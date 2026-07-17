#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const checks = [
  {
    id: 'supabase_service_role_boundary',
    command: process.execPath,
    args: ['scripts/security/check-supabase-service-role-boundary.mjs'],
    env: {},
  },
  {
    id: 'strict_client_boundary_scan',
    command: process.execPath,
    args: ['scripts/security/check-client-boundaries.mjs'],
    env: { STRICT_CLIENT_BOUNDARY_SCAN: '1' },
  },
];

let failed = false;

for (const check of checks) {
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    env: { ...process.env, ...check.env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 180_000,
    maxBuffer: 2 * 1024 * 1024,
  });

  const exitCode = Number.isInteger(result.status) ? result.status : null;
  const passed = exitCode === 0 && !result.error;

  if (passed) {
    console.log(`admin-boundary check passed: ${check.id}`);
    continue;
  }

  failed = true;
  const reason = result.error?.code === 'ETIMEDOUT'
    ? 'timeout'
    : result.error
      ? 'execution_error'
      : `exit_${exitCode ?? 'unknown'}`;

  console.error(`::error title=Admin boundary validation failed::${check.id} failed (${reason})`);

  if (result.stdout?.trim()) {
    console.error(`--- ${check.id} stdout ---`);
    console.error(result.stdout.trim());
  }
  if (result.stderr?.trim()) {
    console.error(`--- ${check.id} stderr ---`);
    console.error(result.stderr.trim());
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log('All administrative-client boundary checks passed.');
}
