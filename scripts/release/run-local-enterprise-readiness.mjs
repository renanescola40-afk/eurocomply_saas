#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { loadLocalEnv } from '../lib/load-local-env.mjs';

loadLocalEnv();

function hasValue(name) {
  return Boolean((process.env[name] ?? '').trim());
}

function run(command, args, extraEnv = {}) {
  return spawnSync(command, args, {
    env: { ...process.env, ...extraEnv },
    shell: false,
    stdio: 'inherit',
  });
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

if (!hasValue('STEP_UP_RUNTIME_PROVIDER_PROOF')) {
  console.error('Local enterprise readiness requires STEP_UP_RUNTIME_PROVIDER_PROOF to be set explicitly after live MFA/IdP verification.');
  console.error('Refusing to generate enterprise runtime evidence from local defaults.');
  process.exit(1);
}

process.env.RELEASE_TARGET = process.env.RELEASE_TARGET || 'enterprise';
process.env.RISCK_COMPLY_ENTERPRISE_RELEASE = process.env.RISCK_COMPLY_ENTERPRISE_RELEASE || 'true';
process.env.STEP_UP_PROVIDER_MODE = process.env.STEP_UP_PROVIDER_MODE || 'supabase_mfa';
process.env.STEP_UP_SIGNING_SECRET = process.env.STEP_UP_SIGNING_SECRET || process.env.AUDIT_CHAIN_SIGNING_SECRET || randomBytes(32).toString('hex');

console.log('Running local enterprise readiness with .env.local loaded. Secret values are not printed. Provider proof must be explicitly supplied.');

const stepUpRuntime = run('npm', ['run', 'security:step-up:runtime']);
const stepUpRuntimeExitCode = stepUpRuntime.status ?? 1;

let productionFinalExitCode = 1;
if (stepUpRuntimeExitCode === 0) {
  const productionFinal = run('npm', ['run', 'release:production-final'], {
    RELEASE_TARGET: 'enterprise',
    RISCK_COMPLY_ENTERPRISE_RELEASE: 'true',
  });
  productionFinalExitCode = productionFinal.status ?? 1;
} else {
  console.error('Skipping enterprise production final gate because step-up runtime validation failed.');
}

const finalEvidence = run('node', ['scripts/release/write-final-validation-runner-evidence.mjs']);
const finalEvidenceExitCode = finalEvidence.status ?? 1;

if (stepUpRuntimeExitCode !== 0) process.exit(stepUpRuntimeExitCode);
if (productionFinalExitCode !== 0) process.exit(productionFinalExitCode);
if (finalEvidenceExitCode !== 0) process.exit(finalEvidenceExitCode);
