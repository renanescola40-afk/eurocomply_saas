#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

export const RECOVERY_POSTGRES_MAJOR_VERSION = 17;
export const RECOVERY_EXPECTED_SERVER_PREFIX = '17.6';
export const DEFAULT_RECOVERY_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const DB_HOST_PORT = '54322';
const DB_CONTAINER_PORT = '5432';

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

export function configurePostgresMajorVersion(configText, majorVersion = RECOVERY_POSTGRES_MAJOR_VERSION) {
  const source = String(configText ?? '');
  if (!/^\s*major_version\s*=\s*\d+\s*$/m.test(source)) {
    throw new Error('Supabase config is missing db.major_version');
  }
  return source.replace(/^\s*major_version\s*=\s*\d+\s*$/m, `major_version = ${majorVersion}`);
}

export function classifyPublishedBinding(line) {
  const value = String(line ?? '').trim();
  if (value === `127.0.0.1:${DB_HOST_PORT}` || value === `[::1]:${DB_HOST_PORT}`) return 'loopback';
  if (value === `0.0.0.0:${DB_HOST_PORT}`) return 'wildcard-v4';
  if (value === `[::]:${DB_HOST_PORT}` || value === `:::${DB_HOST_PORT}`) return 'wildcard-v6';
  return 'invalid';
}

export function listProjectMigrationVersions(migrationsDir) {
  if (!existsSync(migrationsDir)) throw new Error(`Project migrations directory is missing: ${migrationsDir}`);
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d+.*\.sql$/.test(entry.name))
    .map((entry) => entry.name.match(/^(\d+)/)?.[1] ?? '')
    .filter(Boolean)
    .sort();
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

function findDatabaseContainer(projectId) {
  const expected = `supabase_db_${projectId}`;
  const candidates = String(run('docker', ['ps', '--format', '{{.Names}}'], { capture: true }))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((name) => name === expected);
  if (candidates.length !== 1) {
    throw new Error(`Expected one Supabase database container named ${expected}; observed ${candidates.length}`);
  }
  return candidates[0];
}

function firewallArgs(chain, port, comment) {
  return [chain, '!', '-i', 'lo', '-p', 'tcp', '--dport', port, '-m', 'comment', '--comment', comment, '-j', 'DROP'];
}

function dockerUserArgs(port, comment) {
  return ['DOCKER-USER', '-p', 'tcp', '--dport', port, '-m', 'comment', '--comment', comment, '-j', 'DROP'];
}

function installRule(binary, args) {
  run('sudo', [binary, '-I', ...args]);
  run('sudo', [binary, '-C', ...args]);
}

function removeRule(binary, args) {
  try {
    run('sudo', [binary, '-D', ...args]);
  } catch {}
}

function ensureDockerUserChain(binary) {
  run('sudo', [binary, '-S', 'DOCKER-USER'], { capture: true });
}

function readPublishedBindings(containerName) {
  const raw = String(run('docker', ['port', containerName, `${DB_CONTAINER_PORT}/tcp`], { capture: true }));
  const bindings = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (bindings.length === 0) throw new Error('Supabase recovery database has no published PostgreSQL binding');
  const classes = bindings.map(classifyPublishedBinding);
  if (classes.includes('invalid')) {
    throw new Error(`Unexpected Supabase PostgreSQL port binding: ${bindings.join(', ')}`);
  }
  return { bindings, classes };
}

function hardenWildcardBindings(containerName, projectId) {
  const { bindings, classes } = readPublishedBindings(containerName);
  const rules = [];
  const comment = `risck-recovery-${safeToken(projectId)}`.slice(0, 120);
  try {
    if (classes.includes('wildcard-v4')) {
      ensureDockerUserChain('iptables');
      const input = firewallArgs('INPUT', DB_HOST_PORT, comment);
      const dockerUser = dockerUserArgs(DB_CONTAINER_PORT, comment);
      installRule('iptables', input);
      rules.push(['iptables', input]);
      installRule('iptables', dockerUser);
      rules.push(['iptables', dockerUser]);
    }

    if (classes.includes('wildcard-v6')) {
      const input6 = firewallArgs('INPUT', DB_HOST_PORT, comment);
      installRule('ip6tables', input6);
      rules.push(['ip6tables', input6]);
      try {
        ensureDockerUserChain('ip6tables');
        const dockerUser6 = dockerUserArgs(DB_CONTAINER_PORT, comment);
        installRule('ip6tables', dockerUser6);
        rules.push(['ip6tables', dockerUser6]);
      } catch {
        const globalIpv6 = String(run('ip', ['-6', '-o', 'addr', 'show', 'scope', 'global'], { capture: true })).trim();
        if (globalIpv6) throw new Error('IPv6 Docker exposure could not be restricted through DOCKER-USER');
      }
    }

    return { bindings, classes, rules, comment };
  } catch (error) {
    for (const [binary, args] of [...rules].reverse()) removeRule(binary, args);
    throw error;
  }
}

function testLocalConnection(dbUrl) {
  const result = String(run('psql', [
    dbUrl,
    '--no-psqlrc',
    '--tuples-only',
    '--no-align',
    '--set', 'ON_ERROR_STOP=1',
    '--command', 'select 1;',
  ], { capture: true })).trim();
  if (result !== '1') throw new Error('Ephemeral recovery database is not reachable through its loopback URL');
}

function serverVersion(containerName) {
  return String(run('docker', [
    'exec', containerName, 'psql', '-U', 'postgres', '-d', 'postgres', '-At',
    '-c', "select current_setting('server_version');",
  ], { capture: true })).trim();
}

function copyExactShaProjectMigrations(workDir) {
  const sourceDir = join(process.cwd(), 'supabase', 'migrations');
  const targetDir = join(workDir, 'supabase', 'migrations');
  const expectedVersions = listProjectMigrationVersions(sourceDir);
  if (expectedVersions.length === 0) throw new Error('No project migrations were found in the exact-SHA checkout');
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true, force: true });
  return expectedVersions;
}

function verifyExactShaMigrations(dbUrl, expectedVersions) {
  const rows = String(run('psql', [
    dbUrl,
    '--no-psqlrc',
    '--tuples-only',
    '--no-align',
    '--set', 'ON_ERROR_STOP=1',
    '--command', 'select version from supabase_migrations.schema_migrations order by version;',
  ], { capture: true }))
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const observed = new Set(rows);
  const missing = expectedVersions.filter((version) => !observed.has(version));
  if (missing.length > 0) {
    throw new Error(`Exact-SHA project migrations were not fully applied; missing ${missing.length}, first ${missing[0]}`);
  }
}

function applyExactShaProjectSchema(workDir, dbUrl, projectId) {
  const expectedVersions = copyExactShaProjectMigrations(workDir);
  run('supabase', ['--workdir', workDir, 'db', 'reset', '--local', '--no-seed']);
  const containerName = findDatabaseContainer(projectId);
  readPublishedBindings(containerName);
  testLocalConnection(dbUrl);
  verifyExactShaMigrations(dbUrl, expectedVersions);
  return { containerName, migrationCount: expectedVersions.length };
}

function start(mode = 'restore-target') {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Ephemeral recovery database provisioning is restricted to GitHub Actions');
  }
  if (!['restore-target', 'project-schema'].includes(mode)) {
    throw new Error(`Unsupported ephemeral recovery database mode: ${mode}`);
  }
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) throw new Error('RUNNER_TEMP is required');

  const projectId = buildProjectId(process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT);
  const workDir = join(runnerTemp, projectId);
  mkdirSync(workDir, { recursive: true });
  let firewall = null;

  try {
    run('supabase', ['--workdir', workDir, 'init', '--force']);
    const configPath = join(workDir, 'supabase', 'config.toml');
    const configured = configurePostgresMajorVersion(readFileSync(configPath, 'utf8'));
    writeFileSync(configPath, configured, { mode: 0o600 });

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

    let containerName = findDatabaseContainer(projectId);
    firewall = hardenWildcardBindings(containerName, projectId);
    testLocalConnection(dbUrl);

    let migrationCount = 0;
    if (mode === 'project-schema') {
      const applied = applyExactShaProjectSchema(workDir, dbUrl, projectId);
      containerName = applied.containerName;
      migrationCount = applied.migrationCount;
    }

    const observedServerVersion = serverVersion(containerName);
    if (!observedServerVersion.startsWith(RECOVERY_EXPECTED_SERVER_PREFIX)) {
      throw new Error(`Unexpected ephemeral Postgres version: ${observedServerVersion || 'unknown'}`);
    }

    process.stdout.write(`::add-mask::${dbUrl}\n`);
    appendGithubEnv('RECOVERY_ISOLATED_DATABASE_URL', dbUrl);
    appendGithubEnv('RECOVERY_EPHEMERAL_DATABASE_PROVISIONED', 'true');
    appendGithubEnv('RECOVERY_EPHEMERAL_DATABASE_MODE', mode);
    appendGithubEnv('RECOVERY_EPHEMERAL_PROJECT_ID', projectId);
    appendGithubEnv('RECOVERY_EPHEMERAL_WORKDIR', workDir);
    appendGithubEnv('RECOVERY_LOCAL_DB_CONTAINER', containerName);
    appendGithubEnv('RECOVERY_SUPABASE_POSTGRES_VERSION', observedServerVersion);
    appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_COUNT', String(migrationCount));
    appendGithubEnv('RECOVERY_FIREWALL_COMMENT', firewall.comment);
    appendGithubEnv('RECOVERY_FIREWALL_IPV4', firewall.classes.includes('wildcard-v4') ? 'true' : 'false');
    appendGithubEnv('RECOVERY_FIREWALL_IPV6', firewall.classes.includes('wildcard-v6') ? 'true' : 'false');

    const schemaSummary = mode === 'project-schema' ? ` with ${migrationCount} exact-SHA project migrations` : '';
    process.stdout.write(`Ephemeral Supabase database ready using PostgreSQL ${observedServerVersion}${schemaSummary}; published bindings are restricted before proof execution.\n`);
  } catch (error) {
    if (firewall?.rules) {
      for (const [binary, args] of [...firewall.rules].reverse()) removeRule(binary, args);
    }
    try {
      run('supabase', ['--workdir', workDir, 'stop', '--no-backup']);
    } catch {}
    rmSync(workDir, { recursive: true, force: true });
    throw error;
  }
}

function cleanupPersistedFirewallRules() {
  const comment = process.env.RECOVERY_FIREWALL_COMMENT;
  if (!comment) return;
  if (process.env.RECOVERY_FIREWALL_IPV4 === 'true') {
    removeRule('iptables', dockerUserArgs(DB_CONTAINER_PORT, comment));
    removeRule('iptables', firewallArgs('INPUT', DB_HOST_PORT, comment));
  }
  if (process.env.RECOVERY_FIREWALL_IPV6 === 'true') {
    removeRule('ip6tables', dockerUserArgs(DB_CONTAINER_PORT, comment));
    removeRule('ip6tables', firewallArgs('INPUT', DB_HOST_PORT, comment));
  }
}

function stop() {
  const workDir = process.env.RECOVERY_EPHEMERAL_WORKDIR;
  try {
    if (workDir) run('supabase', ['--workdir', workDir, 'stop', '--no-backup']);
  } finally {
    cleanupPersistedFirewallRules();
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  }
  process.stdout.write('Ephemeral Supabase recovery database, local volumes, and temporary firewall rules removed.\n');
}

export function readConfiguredPostgresMajorVersion(configText) {
  const match = String(configText ?? '').match(/^\s*major_version\s*=\s*(\d+)\s*$/m);
  return match ? Number(match[1]) : null;
}

const command = process.argv[2];
if (command === 'start') {
  try {
    start('restore-target');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
} else if (command === 'start-project') {
  try {
    start('project-schema');
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
} else if (process.argv[1]?.endsWith(basename(import.meta.url))) {
  console.error('Usage: manage-ephemeral-recovery-database.mjs <start|start-project|stop>');
  process.exit(2);
}
