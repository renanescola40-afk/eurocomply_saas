#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

import { databaseUrlUsesPort, isLoopbackDatabaseUrl } from './manage-ephemeral-recovery-database.mjs';

const env = (name) => String(process.env[name] ?? '').trim();

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });
}

function appendGithubEnv(name, value) {
  const path = process.env.GITHUB_ENV;
  if (!path) fail('GITHUB_ENV is required');
  appendFileSync(path, `${name}=${value}\n`, 'utf8');
}

function verifyStorageRelations(dbUrl) {
  const result = String(run('psql', [
    dbUrl,
    '--no-psqlrc',
    '--tuples-only',
    '--no-align',
    '--set', 'ON_ERROR_STOP=1',
    '--command', "select (to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null)::text;",
  ], { capture: true })).trim();
  if (result !== 'true') fail('Supabase-managed Storage relations were not materialized');
}

function main() {
  if (env('GITHUB_ACTIONS') !== 'true') fail('Managed-schema priming is restricted to GitHub Actions');
  if (env('RECOVERY_EPHEMERAL_DATABASE_PROVISIONED') !== 'true') fail('Disposable recovery database is not provisioned');
  if (env('RECOVERY_EPHEMERAL_DATABASE_MODE') !== 'restore-target') fail('Managed-schema priming is allowed only for restore-target mode');
  if (env('RECOVERY_MANAGED_SCHEMA_PRIME_PHASE') !== 'pre-production-restore') {
    fail('Managed-schema priming must run before any production snapshot restore');
  }

  const workDir = env('RECOVERY_EPHEMERAL_WORKDIR');
  const dbUrl = env('RECOVERY_ISOLATED_DATABASE_URL');
  const hostPort = Number(env('RECOVERY_LOCAL_DB_HOST_PORT'));
  if (!workDir) fail('RECOVERY_EPHEMERAL_WORKDIR is required');
  if (!isLoopbackDatabaseUrl(dbUrl) || !databaseUrlUsesPort(dbUrl, hostPort)) {
    fail('Disposable recovery database URL is not the expected loopback target');
  }

  // The full local stack is allowed to exist only while the target is still
  // empty. This lets Supabase's own managed migrations materialize Auth/REST/
  // Storage relations without ever exposing restored Production data through
  // local API services. The stack is then stopped and the database alone is
  // restarted before the protected Production snapshot is restored.
  run('supabase', ['--workdir', workDir, 'stop']);
  run('supabase', [
    '--workdir', workDir, 'start',
    '-x', 'realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor',
  ]);
  verifyStorageRelations(dbUrl);
  run('supabase', ['--workdir', workDir, 'stop']);
  run('supabase', ['--workdir', workDir, 'db', 'start']);
  verifyStorageRelations(dbUrl);

  appendGithubEnv('RECOVERY_MANAGED_STORAGE_SCHEMA_PRIMED', 'true');
  process.stdout.write('Supabase-managed Storage schema primed before Production restore; API services are stopped and the isolated target is database-only.\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
