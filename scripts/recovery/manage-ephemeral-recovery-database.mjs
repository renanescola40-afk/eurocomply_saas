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
export const RECOVERY_SUPABASE_POSTGRES_IMAGE_VERSION = '17.6.1.127';
export const DEFAULT_RECOVERY_DB_PORT = 54322;
export const DEFAULT_RECOVERY_DB_URL = `postgresql://postgres:postgres@127.0.0.1:${DEFAULT_RECOVERY_DB_PORT}/postgres`;
export const RECOVERY_DYNAMIC_PORT_MIN = 20000;
export const RECOVERY_DYNAMIC_PORT_SPAN = 20000;
export const RECOVERY_DYNAMIC_PORT_ATTEMPTS = 64;
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

function stablePortSeed(runId, runAttempt = '1') {
  const value = `${String(runId ?? 'local')}:${String(runAttempt ?? '1')}`;
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function selectRecoveryHostPort(runId, runAttempt = '1', occupiedPorts = []) {
  const occupied = new Set(
    [...occupiedPorts]
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0 && value <= 65535),
  );
  const seed = stablePortSeed(runId, runAttempt);
  for (let offset = 0; offset < RECOVERY_DYNAMIC_PORT_ATTEMPTS; offset += 1) {
    const candidate = RECOVERY_DYNAMIC_PORT_MIN + ((seed + offset) % RECOVERY_DYNAMIC_PORT_SPAN);
    if (!occupied.has(candidate)) return candidate;
  }
  throw new Error('No free bounded host port is available for the ephemeral recovery database');
}

export function buildRecoveryDbUrl(hostPort) {
  const port = Number(hostPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Recovery database host port is invalid');
  }
  return `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
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

export function databaseUrlUsesPort(value, hostPort) {
  try {
    const parsed = new URL(String(value));
    const expected = Number(hostPort);
    const observed = parsed.port ? Number(parsed.port) : 5432;
    return Number.isInteger(expected) && observed === expected;
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

function dbPortPattern() {
  return /(\[db\][\s\S]*?^\s*)port\s*=\s*\d+\s*$/m;
}

export function configureRecoveryDatabase(configText, hostPort, majorVersion = RECOVERY_POSTGRES_MAJOR_VERSION) {
  const port = Number(hostPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Recovery database host port is invalid');
  }
  const withMajor = configurePostgresMajorVersion(configText, majorVersion);
  const pattern = dbPortPattern();
  if (!pattern.test(withMajor)) {
    throw new Error('Supabase config is missing db.port');
  }
  return withMajor.replace(pattern, `$1port = ${port}`);
}

export function normalizeSupabasePostgresImageVersion(value = RECOVERY_SUPABASE_POSTGRES_IMAGE_VERSION) {
  const version = String(value ?? '').trim();
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('Recovery Supabase Postgres image version must use the full x.y.z.build format');
  }
  if (!version.startsWith(`${RECOVERY_EXPECTED_SERVER_PREFIX}.`)) {
    throw new Error(`Recovery Supabase Postgres image version must remain on ${RECOVERY_EXPECTED_SERVER_PREFIX}.x`);
  }
  return version;
}

export function recoveryPostgresVersionPinPath(workDir) {
  return join(String(workDir), 'supabase', '.temp', 'postgres-version');
}

export function writeRecoveryPostgresImagePin(workDir, version = RECOVERY_SUPABASE_POSTGRES_IMAGE_VERSION) {
  const normalized = normalizeSupabasePostgresImageVersion(version);
  const tempDir = join(String(workDir), 'supabase', '.temp');
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(recoveryPostgresVersionPinPath(workDir), `${normalized}\n`, { mode: 0o600 });
  return normalized;
}

export function classifyPublishedBinding(line, hostPort = DEFAULT_RECOVERY_DB_PORT) {
  const port = String(hostPort);
  const value = String(line ?? '').trim();
  if (value === `127.0.0.1:${port}` || value === `[::1]:${port}`) return 'loopback';
  if (value === `0.0.0.0:${port}`) return 'wildcard-v4';
  if (value === `[::]:${port}` || value === `:::${port}`) return 'wildcard-v6';
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

function listeningTcpPorts() {
  const output = String(run('ss', ['-H', '-ltn'], { capture: true }));
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[3] ?? '')
    .map((endpoint) => endpoint.match(/:(\d+)$/)?.[1] ?? '')
    .filter(Boolean)
    .map(Number)
    .filter((port) => Number.isInteger(port));
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
  return [chain, '!', '-i', 'lo', '-p', 'tcp', '--dport', String(port), '-m', 'comment', '--comment', comment, '-j', 'DROP'];
}

// Regression signature from the former overbroad rule:
// dockerUserArgs(DB_CONTAINER_PORT, comment)
// It must never be executable again because it blocks unrelated container egress to port 5432.
export function dockerUserArgs(hostPort, containerPort, comment) {
  const publishedPort = Number(hostPort);
  const targetPort = Number(containerPort);
  if (!Number.isInteger(publishedPort) || publishedPort <= 0 || publishedPort > 65535) {
    throw new Error('Recovery Docker firewall host port is invalid');
  }
  if (!Number.isInteger(targetPort) || targetPort <= 0 || targetPort > 65535) {
    throw new Error('Recovery Docker firewall container port is invalid');
  }

  // Match only packets that were originally addressed to the published recovery
  // host port before Docker DNAT. This preserves the isolation boundary without
  // blocking unrelated container egress such as the Supabase session pooler on 5432.
  return [
    'DOCKER-USER',
    '-p', 'tcp',
    '-m', 'conntrack',
    '--ctdir', 'ORIGINAL',
    '--ctorigdstport', String(publishedPort),
    '--dport', String(targetPort),
    '-m', 'comment', '--comment', comment,
    '-j', 'DROP',
  ];
}

function ruleExists(binary, args) {
  try {
    run('sudo', [binary, '-C', ...args], { capture: true });
    return true;
  } catch {
    return false;
  }
}

function installRule(binary, args) {
  if (ruleExists(binary, args)) return false;
  run('sudo', [binary, '-I', ...args]);
  run('sudo', [binary, '-C', ...args]);
  return true;
}

function removeRule(binary, args) {
  try {
    run('sudo', [binary, '-D', ...args]);
  } catch {}
}

function ensureDockerUserChain(binary) {
  run('sudo', [binary, '-S', 'DOCKER-USER'], { capture: true });
}

function readPublishedBindings(containerName, hostPort) {
  const raw = String(run('docker', ['port', containerName, `${DB_CONTAINER_PORT}/tcp`], { capture: true }));
  const bindings = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (bindings.length === 0) throw new Error('Supabase recovery database has no published PostgreSQL binding');
  const classes = bindings.map((line) => classifyPublishedBinding(line, hostPort));
  if (classes.includes('invalid')) {
    throw new Error(`Unexpected Supabase PostgreSQL port binding: ${bindings.join(', ')}`);
  }
  return { bindings, classes };
}

function hardenWildcardBindings(containerName, projectId, hostPort) {
  const { bindings, classes } = readPublishedBindings(containerName, hostPort);
  const rules = [];
  const comment = `risck-recovery-${safeToken(projectId)}`.slice(0, 120);
  try {
    if (classes.includes('wildcard-v4')) {
      ensureDockerUserChain('iptables');
      const input = firewallArgs('INPUT', hostPort, comment);
      const dockerUser = dockerUserArgs(hostPort, DB_CONTAINER_PORT, comment);
      if (installRule('iptables', input)) rules.push(['iptables', input]);
      if (installRule('iptables', dockerUser)) rules.push(['iptables', dockerUser]);
    }

    if (classes.includes('wildcard-v6')) {
      const input6 = firewallArgs('INPUT', hostPort, comment);
      if (installRule('ip6tables', input6)) rules.push(['ip6tables', input6]);
      try {
        ensureDockerUserChain('ip6tables');
        const dockerUser6 = dockerUserArgs(hostPort, DB_CONTAINER_PORT, comment);
        if (installRule('ip6tables', dockerUser6)) rules.push(['ip6tables', dockerUser6]);
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

function mergeFirewallState(previous, current) {
  if (!previous) return current;
  return {
    bindings: current.bindings,
    classes: [...new Set([...previous.classes, ...current.classes])],
    rules: [...previous.rules, ...current.rules],
    comment: current.comment,
  };
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

function containerImage(containerName) {
  return String(run('docker', ['inspect', '--format', '{{.Config.Image}}', containerName], { capture: true })).trim();
}

export function parseSupabasePostgresImageVersion(image) {
  const match = String(image ?? '').trim().match(/(?:^|\/)postgres:(\d+\.\d+\.\d+\.\d+)$/);
  return match?.[1] ?? null;
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

function applyExactShaProjectSchema(workDir, dbUrl, projectId, hostPort) {
  const expectedVersions = copyExactShaProjectMigrations(workDir);
  run('supabase', ['--workdir', workDir, 'db', 'reset', '--local', '--no-seed']);
  const containerName = findDatabaseContainer(projectId);
  const firewall = hardenWildcardBindings(containerName, projectId, hostPort);
  testLocalConnection(dbUrl);
  verifyExactShaMigrations(dbUrl, expectedVersions);
  return { containerName, migrationCount: expectedVersions.length, firewall };
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
  const hostPort = selectRecoveryHostPort(
    process.env.GITHUB_RUN_ID,
    process.env.GITHUB_RUN_ATTEMPT,
    listeningTcpPorts(),
  );
  const workDir = join(runnerTemp, projectId);
  mkdirSync(workDir, { recursive: true });
  let firewall = null;

  try {
    run('supabase', ['--workdir', workDir, 'init', '--force']);
    const expectedPostgresImageVersion = writeRecoveryPostgresImagePin(workDir);
    const configPath = join(workDir, 'supabase', 'config.toml');
    const configured = configureRecoveryDatabase(readFileSync(configPath, 'utf8'), hostPort);
    writeFileSync(configPath, configured, { mode: 0o600 });

    run('supabase', ['--workdir', workDir, 'db', 'start']);

    let status = '';
    try {
      status = String(run('supabase', ['--workdir', workDir, 'status', '-o', 'env'], { capture: true }));
    } catch {
      status = String(run('supabase', ['--workdir', workDir, 'status'], { capture: true }));
    }
    const dbUrl = parseLocalDbUrl(status) || buildRecoveryDbUrl(hostPort);
    if (!isLoopbackDatabaseUrl(dbUrl)) {
      throw new Error('Supabase CLI returned a non-loopback recovery database URL');
    }
    if (!databaseUrlUsesPort(dbUrl, hostPort)) {
      throw new Error('Supabase CLI returned a recovery database URL on an unexpected host port');
    }

    let containerName = findDatabaseContainer(projectId);
    const observedPostgresImageVersion = parseSupabasePostgresImageVersion(containerImage(containerName));
    if (observedPostgresImageVersion !== expectedPostgresImageVersion) {
      throw new Error(
        `Unexpected Supabase Postgres image version: ${observedPostgresImageVersion || 'unknown'}; expected ${expectedPostgresImageVersion}`,
      );
    }
    firewall = hardenWildcardBindings(containerName, projectId, hostPort);
    testLocalConnection(dbUrl);

    let migrationCount = 0;
    if (mode === 'project-schema') {
      const applied = applyExactShaProjectSchema(workDir, dbUrl, projectId, hostPort);
      containerName = applied.containerName;
      migrationCount = applied.migrationCount;
      firewall = mergeFirewallState(firewall, applied.firewall);
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
    appendGithubEnv('RECOVERY_LOCAL_DB_HOST_PORT', String(hostPort));
    appendGithubEnv('RECOVERY_SUPABASE_POSTGRES_VERSION', expectedPostgresImageVersion);
    appendGithubEnv('RECOVERY_POSTGRES_SERVER_VERSION', observedServerVersion);
    appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_COUNT', String(migrationCount));
    appendGithubEnv('RECOVERY_FIREWALL_COMMENT', firewall.comment);
    appendGithubEnv('RECOVERY_FIREWALL_IPV4', firewall.classes.includes('wildcard-v4') ? 'true' : 'false');
    appendGithubEnv('RECOVERY_FIREWALL_IPV6', firewall.classes.includes('wildcard-v6') ? 'true' : 'false');

    const schemaSummary = mode === 'project-schema' ? ` with ${migrationCount} exact-SHA project migrations` : '';
    process.stdout.write(`Ephemeral Supabase database ready using Supabase Postgres ${expectedPostgresImageVersion} / PostgreSQL ${observedServerVersion}${schemaSummary}; published bindings are restricted before proof execution.\n`);
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
  const hostPort = Number(process.env.RECOVERY_LOCAL_DB_HOST_PORT);
  if (!Number.isInteger(hostPort) || hostPort <= 0 || hostPort > 65535) {
    throw new Error('Persisted recovery database host port is invalid');
  }
  if (process.env.RECOVERY_FIREWALL_IPV4 === 'true') {
    removeRule('iptables', dockerUserArgs(hostPort, DB_CONTAINER_PORT, comment));
    removeRule('iptables', firewallArgs('INPUT', hostPort, comment));
  }
  if (process.env.RECOVERY_FIREWALL_IPV6 === 'true') {
    removeRule('ip6tables', dockerUserArgs(hostPort, DB_CONTAINER_PORT, comment));
    removeRule('ip6tables', firewallArgs('INPUT', hostPort, comment));
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

export function readConfiguredDatabasePort(configText) {
  const match = String(configText ?? '').match(/\[db\][\s\S]*?^\s*port\s*=\s*(\d+)\s*$/m);
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
