#!/usr/bin/env node
// Prevent accidental cloud/production targeting when preparing local synthetic RLS tests.
// This preflight deliberately does not create users, modify tables, or start the live runner.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const confirmation = 'LOCAL_SYNTHETIC_ONLY';

export function assertLocalSupabaseTarget(env = process.env) {
  if (env.RISCK_LOCAL_TEST_CONFIRMATION !== confirmation) {
    throw new Error('Local synthetic test confirmation is missing');
  }

  const expectedPort = String(env.SUPABASE_LOCAL_API_PORT || '54321');
  if (!/^\d{1,5}$/.test(expectedPort) || Number(expectedPort) < 1024 || Number(expectedPort) > 65535) {
    throw new Error('Invalid local Supabase API port');
  }

  const targets = [env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_URL]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (targets.length === 0) throw new Error('Local Supabase API URL is missing');

  const origins = targets.map((raw) => {
    let url;
    try { url = new URL(raw); } catch { throw new Error('Invalid Supabase API URL'); }
    if (url.protocol !== 'http:' || !loopbackHosts.has(url.hostname) || url.port !== expectedPort) {
      throw new Error('Refusing non-loopback, non-HTTP, or unexpected-port Supabase target');
    }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('Refusing noncanonical Supabase API URL');
    }
    return url.origin;
  });

  if (new Set(origins).size !== 1) {
    throw new Error('Supabase API URL environment variables disagree');
  }
  return { target: origins[0], scope: 'isolated-loopback-only' };
}

const isCli = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    const result = assertLocalSupabaseTarget();
    console.log(`Local-only Supabase preflight PASS: ${result.target}; no database actions executed`);
  } catch (error) {
    console.error(`Local-only Supabase preflight BLOCKED: ${error.message}`);
    process.exitCode = 1;
  }
}
