#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dependentName = '20260725180000_enterprise_access_operations_explicit_deny_policies.sql';
const dependentPath = join(root, 'supabase', 'migrations', dependentName);
const heldPath = `${dependentPath}.derived-prerequisite-blocked`;
const batchHPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-h.md');
const batchNPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-n.md');
const delegate = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary-v2.mjs');

function fail(message) {
  throw new Error(message);
}

function appendGithubEnv(name, value) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Reviewed disposable schema boundary v3 is restricted to GitHub Actions');
  }

  const batchH = readFileSync(batchHPath, 'utf8');
  const batchN = readFileSync(batchNPath, 'utf8');
  if (!batchH.includes(`| H11 | \`${dependentName}\` | \`PENDING_DEPLOYMENT\``)) {
    fail('Batch-H evidence no longer proves H11 pending-deployment classification');
  }
  if (!batchN.includes('| N9 | `20260724200000_enterprise_access_operations_center.sql` | `PENDING_DEPLOYMENT` | **PREREQUISITE_BLOCKED')) {
    fail('Batch-N evidence no longer proves N9 prerequisite-blocked execution boundary');
  }
  if (!batchN.includes('prerequisiteBlockedExecutionAuthorized = false')) {
    fail('Batch-N evidence no longer preserves prerequisite-blocked execution denial');
  }

  if (!existsSync(dependentPath) || existsSync(heldPath)) {
    fail('H11 disposable hold paths are not in the expected state');
  }
  const sql = readFileSync(dependentPath, 'utf8');
  if (!sql.includes('on public.enterprise_access_operations')) {
    fail('H11 no longer depends on the N9 enterprise_access_operations relation');
  }

  let delegatedError = null;
  let restoreError = null;
  try {
    renameSync(dependentPath, heldPath);
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    delegatedError = error;
  } finally {
    try {
      if (!existsSync(heldPath) || existsSync(dependentPath)) {
        fail('H11 derived prerequisite hold state drifted before restore');
      }
      renameSync(heldPath, dependentPath);
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) throw restoreError;
  if (delegatedError) throw delegatedError;

  appendGithubEnv('RECOVERY_EPHEMERAL_DERIVED_PREREQUISITE_BLOCKED_FILE_COUNT', '1');
  process.stdout.write('Disposable replay held H11 because prerequisite N9 remains execution-blocked; historical bytes were restored.\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
