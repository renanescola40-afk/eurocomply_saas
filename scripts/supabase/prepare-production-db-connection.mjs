#!/usr/bin/env node

import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const ALLOWED_PORTS = new Set(['', '5432', '6543']);

function decodeComponent(value, label) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`${label} is not valid percent-encoding`);
  }
}

export function normalizeProductionDbUrl(rawValue, projectRef) {
  if (!PROJECT_REF_PATTERN.test(projectRef ?? '')) {
    throw new Error('SUPABASE_PROJECT_ID must be a 20-character lowercase project reference');
  }

  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const normalized = rawValue.trim();
  if (!normalized) {
    throw new Error('SUPABASE_DB_URL is empty after trimming outer whitespace');
  }
  if (/[\r\n]/.test(normalized)) {
    throw new Error('SUPABASE_DB_URL must be a single line');
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('SUPABASE_DB_URL is not a valid PostgreSQL connection URL');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('SUPABASE_DB_URL must use postgres:// or postgresql://');
  }
  if (parsed.hash) {
    throw new Error('SUPABASE_DB_URL contains a URL fragment; percent-encode special password characters');
  }
  if (!parsed.hostname) {
    throw new Error('SUPABASE_DB_URL must include a hostname');
  }
  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new Error('SUPABASE_DB_URL must use port 5432 or 6543');
  }
  if (parsed.pathname !== '/postgres') {
    throw new Error('SUPABASE_DB_URL must target the postgres database');
  }

  const username = decodeComponent(parsed.username, 'Database username');
  const password = decodeComponent(parsed.password, 'Database password');
  if (!username) {
    throw new Error('SUPABASE_DB_URL must include a database username');
  }
  if (!password) {
    throw new Error('SUPABASE_DB_URL must include the database password');
  }

  const directMatch = parsed.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
  const isPooler = parsed.hostname.endsWith('.pooler.supabase.com');

  let transport;
  let observedProjectRef;
  if (directMatch) {
    transport = 'direct';
    observedProjectRef = directMatch[1];
    if (username !== 'postgres') {
      throw new Error('Direct Supabase connections must use the postgres database user');
    }
  } else if (isPooler) {
    transport = parsed.port === '6543' ? 'transaction_pooler' : 'session_pooler';
    const poolerUserMatch = username.match(/^postgres\.([a-z0-9]{20})$/);
    if (!poolerUserMatch) {
      throw new Error('Supabase pooler connections must use postgres.<project-ref> as the username');
    }
    observedProjectRef = poolerUserMatch[1];
  } else {
    throw new Error('SUPABASE_DB_URL hostname is not an approved Supabase database endpoint');
  }

  if (observedProjectRef !== projectRef) {
    throw new Error('SUPABASE_DB_URL does not belong to SUPABASE_PROJECT_ID');
  }

  return {
    url: normalized,
    diagnostics: {
      status: 'ready',
      transport,
      host: parsed.hostname,
      port: parsed.port || '5432',
      database: 'postgres',
      projectRefSuffix: projectRef.slice(-6),
      trimmedOuterWhitespace: normalized !== rawValue,
    },
  };
}

export function writeProtectedConnectionFile({ rawValue, projectRef, outputPath }) {
  if (!outputPath) {
    throw new Error('--write-file requires a destination path');
  }

  const resolved = normalizeProductionDbUrl(rawValue, projectRef);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, resolved.url, { encoding: 'utf8', mode: 0o600 });
  chmodSync(outputPath, 0o600);
  return resolved.diagnostics;
}

export function runCli(argv = process.argv.slice(2), env = process.env) {
  const writeIndex = argv.indexOf('--write-file');
  const outputPath = writeIndex >= 0 ? argv[writeIndex + 1] : undefined;
  const diagnostics = writeProtectedConnectionFile({
    rawValue: env.SUPABASE_DB_URL,
    projectRef: env.SUPABASE_PROJECT_ID,
    outputPath,
  });

  process.stdout.write(`${JSON.stringify(diagnostics)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database connection validation error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
