#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const RECOVERY_POSTGRES_VERSION = '17.6.1.136';
export const DEFAULT_RECOVERY_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function safeToken(value) {
  return String(value ?? '')
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function buildProjectId(runId, runAttempt = '1') {
  const run = safeToken(runId) || 'local';
  const attempt = safeToken(runAttempt) || '1';
  return `risck-recovery-${run}-${attempt}`.slice(0, 63);
}

export function parseLocalDbUrl(statusOutput) {
  const text = String(statusOutput ?? '');
  const envMatch = text.match(/^DB_URL=(?:"([^"]+)"|'([^']+)'|([^\s]+))$/m);
  if (envMatch) return envMatch[1] || envMatch[2] || envMatch[3];
  const prettyMatch = text.match(/DB URL:\s*(postgres(?:ql)?:\/\/[^\s]+)/i);
  return prettyMatch?.[1] ?? null;
}

export function isLoopbackDatabaseUrl(value) {
  try {
    const parsed = new URL(String(value));
    return ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    ...options,
  });
}

function appendGithubEnv(name, value) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) throw new Error('GITHUB_ENV is required for ephemeral recovery database provisioning');
  appendFileSync(envFile, `${name}=${value}\n`, { encoding: 'utf8' });
}

function verifyDockerBinding(projectId) {
  const candidates = String(run('docker', ['ps', '--format', '{{.Names}}|{{.Ports}}'], { capture: true }))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith('supabase_db_'));

  if (candidates.length !== 1) {
    throw new Error(`Expected one Supabase local database container for ${projectId}; observed ${candidates.length}`);
  }

  const [containerName, ports = ''] = candidates[0].split('|', 2);
  if (!/(127\.0\.0\.1|\[::1\]):54322->5432\/tcp/.test(ports)) {
    throw new Error('Ephemeral recovery database must bind PostgreSQL only to a loopback interface');
  }
  return containerName;
}

function start() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Ephemeral recovery database provisioning is restricted to GitHub Actions');
  }
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) throw new Error('RUNNER_TEMP is required');

  const projectId = buildProjectId(process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT);
  const workDir = join(runnerTemp, projectId);
  mkdirSync(workDir, { recursive: true });

  try {
    run('supabase', ['--workdir', workDir, 'init', '--force']);
    const tempDir = join(workDir, 'supabase', '.temp');
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(join(tempDir, 'postgres-version'), `${RECOVERY_POSTGRES_VERSION}\n`, { mode: 0o600 });

    run('supabase', ['--workdir', workDir, 'db', 'start']);

    let status = '';
    try {
      status = String(run('supabase', ['--workdir', workDir, 'status', '-o', 'env'], { capture: true }));
    } catch {
      status = String(run('supabase', ['--workdir', workDir, 'status'], { capture: true }));
    }
    const dbUrl = parseLocalDbUrl(status) || DEFAULT_RECOVERY_DB_URL;
    if (!isLoopbackDatabaseUrl(dbUrl)) {
      throw new Error('Supabase CLI returned a non-loopback recovery database URL');
    }

    const containerName = verifyDockerBinding(projectId);
    const serverVersion = String(run('docker', [
      'exec', containerName, 'psql', '-U', 'postgres', '-d', 'postgres', '-At',
      '-c', "select current_setting('server_version');",
    ], { capture: true })).trim();
    if (!serverVersion.startsWith('17.6')) {
      throw new Error(`Unexpected ephemeral Postgres version: ${serverVersion || 'unknown'}`);
    }

    process.stdout.write(`::add-mask::${dbUrl}\n`);
    appendGithubEnv('RECOVERY_ISOLATED_DATABASE_URL', dbUrl);
    appendGithubEnv('RECOVERY_EPHEMERAL_DATABASE_PROVISIONED', 'true');
    appendGithubEnv('RECOVERY_EPHEMERAL_PROJECT_ID', projectId);
    appendGithubEnv('RECOVERY_EPHEMERAL_WORKDIR', workDir);
    appendGithubEnv('RECOVERY_LOCAL_DB_CONTAINER', containerName);
    appendGithubEnv('RECOVERY_SUPABASE_POSTGRES_VERSION', RECOVERY_POSTGRES_VERSION);

    process.stdout.write(`Ephemeral Supabase recovery database ready on loopback using PostgreSQL ${serverVersion}.\n`);
  } catch (error) {
    try {
      run('supabase', ['--workdir', workDir, 'stop', '--no-backup']);
    } catch {}
    rmSync(workDir, { recursive: true, force: true });
    throw error;
  }
}

function stop() {
  const workDir = process.env.RECOVERY_EPHEMERAL_WORKDIR;
  if (!workDir) {
    process.stdout.write('No ephemeral recovery database workdir was recorded; cleanup is a no-op.\n');
    return;
  }

  try {
    run('supabase', ['--workdir', workDir, 'stop', '--no-backup']);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
  process.stdout.write('Ephemeral Supabase recovery database and local volumes removed.\n');
}

export function readConfiguredPostgresVersion(workDir) {
  return readFileSync(join(workDir, 'supabase', '.temp', 'postgres-version'), 'utf8').trim();
}

const command = process.argv[2];
if (command === 'start') {
  try {
    start();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
} else if (command === 'stop') {
  try {
    stop();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
} else if (process.argv[1]?.endsWith('manage-ephemeral-recovery-database.mjs')) {
  console.error('Usage: manage-ephemeral-recovery-database.mjs <start|stop>');
  process.exit(2);
}
