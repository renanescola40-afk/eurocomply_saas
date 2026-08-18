#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildProjectId,
  isLoopbackDatabaseUrl,
} from './manage-ephemeral-recovery-database.mjs';

const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const SAFE_CONTAINER = /^supabase_db_risck-recovery-[A-Za-z0-9_-]{1,63}$/;

export function expectedRecoveryContainerName(runId, runAttempt = '1') {
  return `supabase_db_${buildProjectId(runId, runAttempt)}`;
}

function normalizeDatabaseUrl(value) {
  const raw = String(value ?? '').replace(/[\r\n]+/g, '').trim();
  if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  try {
    const parsed = new URL(raw);
    if (!POSTGRES_PROTOCOLS.has(parsed.protocol) || !parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function buildPinnedPsqlInvocation({
  args,
  runId,
  runAttempt = '1',
  configuredContainer,
}) {
  if (!Array.isArray(args) || args.length < 1) {
    throw new Error('recovery_psql_database_url_missing');
  }

  const databaseUrl = normalizeDatabaseUrl(args[0]);
  if (!databaseUrl) throw new Error('recovery_psql_database_url_invalid');

  const expectedContainer = expectedRecoveryContainerName(runId, runAttempt);
  const requestedContainer = String(configuredContainer ?? '').trim();
  if (requestedContainer && requestedContainer !== expectedContainer) {
    throw new Error('recovery_psql_container_identity_mismatch');
  }
  if (!SAFE_CONTAINER.test(expectedContainer)) {
    throw new Error('recovery_psql_container_identity_invalid');
  }

  const remainingArgs = args.slice(1).map((value) => String(value));
  const localTarget = isLoopbackDatabaseUrl(databaseUrl);

  return {
    command: 'docker',
    args: [
      'exec',
      expectedContainer,
      'psql',
      ...(localTarget ? ['-U', 'postgres', '-d', 'postgres'] : [databaseUrl]),
      ...remainingArgs,
    ],
    localTarget,
    containerName: expectedContainer,
  };
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('recovery_psql_proxy_requires_github_actions');
  }
  const runId = String(process.env.GITHUB_RUN_ID ?? '').trim();
  const runAttempt = String(process.env.GITHUB_RUN_ATTEMPT ?? '1').trim();
  if (!/^\d+$/.test(runId) || !/^\d+$/.test(runAttempt)) {
    throw new Error('recovery_psql_github_run_identity_invalid');
  }

  const invocation = buildPinnedPsqlInvocation({
    args: process.argv.slice(2),
    runId,
    runAttempt,
    configuredContainer: process.env.RECOVERY_LOCAL_DB_CONTAINER,
  });

  execFileSync(invocation.command, invocation.args, {
    stdio: 'inherit',
    shell: false,
    timeout: 15 * 60_000,
    env: process.env,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch {
    // Never echo database URLs, command arguments, or provider error payloads.
    console.error('recovery_pinned_psql_failed');
    process.exit(1);
  }
}
