#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationName = '20260728190000_market_leadership_foundations.sql';
const migrationPath = join(root, 'supabase', 'migrations', migrationName);
const heldPath = `${migrationPath}.derived-prerequisite-blocked`;
const batchNPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-n.md');
const delegate = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary-v2.mjs');

function fail(message) {
  throw new Error(message);
}

function appendGithubEnv(name, value) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

function validateBoundary() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Market-leadership disposable replay boundary is restricted to GitHub Actions');
  }
  if (!existsSync(batchNPath)) fail(`Missing Batch-N membership-helper evidence: ${batchNPath}`);
  if (!existsSync(migrationPath)) fail(`Missing market-leadership migration: ${migrationName}`);
  if (existsSync(heldPath)) fail(`Market-leadership hold path already exists: ${heldPath}`);

  const batchN = readFileSync(batchNPath, 'utf8');
  if (!batchN.includes('public.is_organization_member(uuid)')
      || !batchN.includes('PREREQUISITE_BLOCKED')
      || !batchN.includes('prerequisiteBlockedExecutionAuthorized = false')) {
    fail('Batch-N evidence no longer proves the unresolved membership-helper execution boundary');
  }

  const sql = readFileSync(migrationPath, 'utf8');
  for (const marker of [
    'create table if not exists public.ai_governance_entities',
    'create table if not exists public.normalized_ai_controls',
    'using (public.is_organization_member(organization_id))',
  ]) {
    if (!sql.includes(marker)) fail(`Market-leadership prerequisite marker drifted: ${marker}`);
  }
}

function main() {
  validateBoundary();
  let held = false;
  let replayError = null;
  let restoreError = null;

  try {
    renameSync(migrationPath, heldPath);
    held = true;
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    replayError = error;
  } finally {
    if (held || existsSync(heldPath)) {
      try {
        if (!existsSync(heldPath) || existsSync(migrationPath)) {
          fail('Market-leadership hold state drifted before restore');
        }
        renameSync(heldPath, migrationPath);
      } catch (error) {
        restoreError = error;
      }
    }
  }

  if (restoreError) throw restoreError;
  if (replayError) throw replayError;

  appendGithubEnv('RECOVERY_EPHEMERAL_MARKET_LEADERSHIP_PREREQUISITE_BLOCKED_FILE_COUNT', '1');
  process.stdout.write(
    `Disposable replay held ${migrationName} behind the unresolved public.is_organization_member(uuid) foundation and restored its canonical bytes.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
