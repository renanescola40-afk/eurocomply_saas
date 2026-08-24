#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function normalizeProjectRef(value) {
  const ref = String(value ?? '').trim().toLowerCase();
  assert(/^[a-z0-9]{8,32}$/.test(ref), 'Supabase project reference format is invalid');
  return ref;
}
export function projectRefFromApiUrl(value) {
  const url = new URL(String(value ?? ''));
  assert(url.protocol === 'https:', 'Supabase API URL must use HTTPS');
  const match = url.hostname.toLowerCase().match(/^([a-z0-9]+)\.supabase\.co$/);
  assert(match, 'Supabase API URL hostname is not canonical');
  return normalizeProjectRef(match[1]);
}
export function projectRefFromPoolerUrl(value) {
  const url = new URL(String(value ?? ''));
  assert(['postgres:', 'postgresql:'].includes(url.protocol), 'Supabase pooler URL must use PostgreSQL');
  assert(url.hostname.toLowerCase().endsWith('.pooler.supabase.com'), 'Supabase pooler hostname is not canonical');
  const username = decodeURIComponent(url.username || '');
  const match = username.match(/^postgres\.([a-z0-9]+)$/i);
  assert(match, 'Supabase pooler username must bind the project reference as postgres.<ref>');
  return normalizeProjectRef(match[1]);
}
export function projectDigest(ref) {
  return `sha256:${createHash('sha256').update(normalizeProjectRef(ref)).digest('hex')}`;
}
export function digestFromApiUrl(value) { return projectDigest(projectRefFromApiUrl(value)); }
export function digestFromPoolerUrl(value) { return projectDigest(projectRefFromPoolerUrl(value)); }

function requireEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  assert(value, `${name} is required`);
  return value;
}
async function main(argv) {
  const [mode] = argv;
  if (mode === 'emit-pooler-digest') {
    const digest = digestFromPoolerUrl(requireEnv('SUPABASE_DB_POOLER_URL'));
    const output = requireEnv('GITHUB_OUTPUT');
    appendFileSync(output, `project_digest=${digest}\n`);
    process.stdout.write('Supabase Production project binding digest emitted.\n');
    return;
  }
  if (mode === 'verify-api-digest') {
    const expected = requireEnv('EXPECTED_SUPABASE_PROJECT_DIGEST');
    assert(/^sha256:[a-f0-9]{64}$/.test(expected), 'expected project digest is invalid');
    const observed = digestFromApiUrl(requireEnv('NEXT_PUBLIC_SUPABASE_URL'));
    assert(observed === expected, 'live Supabase API project does not match the Production promotion project');
    process.stdout.write('Supabase live project binding: PASS\n');
    return;
  }
  throw new Error('usage: supabase-project-binding.mjs <emit-pooler-digest|verify-api-digest>');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
