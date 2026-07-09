#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { loadLocalEnv } from '../lib/load-local-env.mjs';

loadLocalEnv();

function hasValue(name) {
  return Boolean((process.env[name] ?? '').trim());
}

const requiredSupabaseEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingSupabaseEnv = requiredSupabaseEnv.filter((name) => !hasValue(name));
if (missingSupabaseEnv.length > 0) {
  console.error('Local enterprise readiness cannot start because required Supabase env vars are missing from .env.local:');
  for (const name of missingSupabaseEnv) console.error(`- ${name}`);
  process.exit(1);
}

process.env.RISCK_COMPLY_ENTERPRISE_RELEASE = process.env.RISCK_COMPLY_ENTERPRISE_RELEASE || 'true';
process.env.STEP_UP_PROVIDER_MODE = process.env.STEP_UP_PROVIDER_MODE || 'supabase_mfa';
process.env.STEP_UP_RUNTIME_PROVIDER_PROOF = process.env.STEP_UP_RUNTIME_PROVIDER_PROOF || 'true';
process.env.STEP_UP_SIGNING_SECRET = process.env.STEP_UP_SIGNING_SECRET || process.env.AUDIT_CHAIN_SIGNING_SECRET || randomBytes(32).toString('hex');

console.log('Running local enterprise readiness with .env.local loaded. Secret values are not printed.');

for (const command of [
  ['npm', ['run', 'security:step-up:runtime']],
  ['npm', ['run', 'release:enterprise-readiness']],
]) {
  const [binary, args] = command;
  const result = spawnSync(binary, args, {
    env: process.env,
    shell: false,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
