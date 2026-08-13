#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const legacyName = '20260721214000_enterprise_contract_billing_lifecycle.sql';
const hardeningName = '20260721214100_enterprise_billing_lifecycle_hardening.sql';
const legacyPath = join(migrationsDir, legacyName);
const heldPath = join(migrationsDir, legacyName + '.reviewed-hold');
const hardeningPath = join(migrationsDir, hardeningName);
const reviewedReplay = join(process.cwd(), 'scripts', 'recovery', 'run-ephemeral-project-schema-replay-reviewed-boundary-v2.mjs');
const invalidStatement = 'return next (v_contract.id, v_contract.organization_id, v_contract.status, v_next, v_reason);';
const safeStatement = 'return query select v_contract.id, v_contract.organization_id, v_contract.status, v_next, v_reason;';

function fail(message) {
  throw new Error(message);
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') fail('Disposable billing lifecycle bridge is restricted to GitHub Actions');
  if (!existsSync(legacyPath) || !existsSync(hardeningPath)) fail('Billing lifecycle replay prerequisites are missing');
  if (existsSync(heldPath)) fail('Billing lifecycle hold path already exists');

  const legacySql = readFileSync(legacyPath, 'utf8');
  const hardeningSql = readFileSync(hardeningPath, 'utf8');
  const occurrences = legacySql.split(invalidStatement).length - 1;
  if (occurrences !== 1) fail(`Expected one reviewed legacy RETURN NEXT statement, found ${occurrences}`);
  if (!hardeningSql.includes('process_enterprise_contract_lifecycle_v2_atomic')) fail('Canonical billing lifecycle v2 function is missing');
  if (!hardeningSql.includes(safeStatement)) fail('Canonical billing lifecycle v2 no longer proves the safe return behavior');
  if (!hardeningSql.includes('revoke all on function public.process_enterprise_contract_lifecycle_atomic(integer) from service_role')) {
    fail('Canonical billing lifecycle hardening no longer revokes the superseded function');
  }

  renameSync(legacyPath, heldPath);
  try {
    writeFileSync(legacyPath, legacySql.replace(invalidStatement, safeStatement), 'utf8');
    execFileSync(process.execPath, [reviewedReplay], { stdio: 'inherit', env: process.env });
  } finally {
    rmSync(legacyPath, { force: true });
    if (!existsSync(heldPath)) fail('Billing lifecycle hold artifact disappeared during replay');
    renameSync(heldPath, legacyPath);
  }

  process.stdout.write('Disposable billing lifecycle bridge completed; canonical historical bytes restored.\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
