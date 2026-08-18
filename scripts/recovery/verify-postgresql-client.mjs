#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const MIN_POSTGRESQL_CLIENT_MAJOR = 16;
export const MAX_POSTGRESQL_CLIENT_MAJOR = 17;

export function parsePostgresqlClientVersion(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/psql\s+\(PostgreSQL\)\s+(\d+)(?:\.(\d+))?/i);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = match[2] === undefined ? null : Number(match[2]);
  if (!Number.isInteger(major) || (minor !== null && !Number.isInteger(minor))) return null;
  return { major, minor, raw: text };
}

export function evaluatePostgresqlClientVersion(
  value,
  {
    minMajor = MIN_POSTGRESQL_CLIENT_MAJOR,
    maxMajor = MAX_POSTGRESQL_CLIENT_MAJOR,
  } = {},
) {
  const parsed = parsePostgresqlClientVersion(value);
  if (!parsed) {
    return { ok: false, code: 'postgresql_client_version_unparseable', parsed: null };
  }
  if (parsed.major < minMajor || parsed.major > maxMajor) {
    return { ok: false, code: 'postgresql_client_version_unsupported', parsed };
  }
  return { ok: true, code: null, parsed };
}

function appendGithubEnv(name, value) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) return;
  appendFileSync(envFile, `${name}=${value}\n`, { encoding: 'utf8' });
}

export function inspectPostgresqlClient({ run = execFileSync } = {}) {
  let output = '';
  try {
    output = String(run('psql', ['--version'], {
      encoding: 'utf8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })).trim();
  } catch {
    return { ok: false, code: 'postgresql_client_unavailable', parsed: null };
  }
  return evaluatePostgresqlClientVersion(output);
}

export function verifyPostgresqlClient(options = {}) {
  const result = inspectPostgresqlClient(options);
  if (!result.ok) {
    throw new Error(result.code);
  }
  appendGithubEnv('RECOVERY_PSQL_CLIENT_MAJOR', String(result.parsed.major));
  appendGithubEnv('RECOVERY_PSQL_CLIENT_MINOR', result.parsed.minor === null ? 'unknown' : String(result.parsed.minor));
  appendGithubEnv('RECOVERY_PSQL_CLIENT_PREFLIGHT', 'true');
  return result;
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  try {
    const result = verifyPostgresqlClient();
    process.stdout.write(`PostgreSQL client preflight passed (psql major ${result.parsed.major}).\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'postgresql_client_preflight_failed');
    process.exit(1);
  }
}
