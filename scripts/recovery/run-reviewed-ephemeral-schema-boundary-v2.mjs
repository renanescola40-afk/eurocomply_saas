#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const batchLPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-l.md');
const batchHPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-h.md');
const batchNPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-n.md');
const delegate = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary.mjs');
const derivedDependentName = '20260725180000_enterprise_access_operations_explicit_deny_policies.sql';
const derivedDependentPath = join(root, 'supabase', 'migrations', derivedDependentName);
const derivedHeldPath = `${derivedDependentPath}.derived-prerequisite-blocked`;

const blockedRules = Object.freeze([
  Object.freeze({
    id: 'L13',
    name: '20260724001000_enterprise_group_access_reconciliation.sql',
    reviewMarkers: Object.freeze([
      'enterprise_scim_identities.membership_id',
      'canonical contract reconciliation is required',
    ]),
    sourceMarkers: Object.freeze([
      'create or replace function public.list_enterprise_group_access_reconciliation_candidates(',
      '  current_role text,',
      'i.membership_id',
    ]),
  }),
  Object.freeze({
    id: 'L15',
    name: '20260724103000_enterprise_group_access_reconciliation_queue.sql',
    reviewMarkers: Object.freeze([
      'No silent duplicate-history resolution is authorized.',
    ]),
    sourceMarkers: Object.freeze([
      'create table if not exists public.enterprise_group_access_reconciliation_jobs',
      'unique (organization_id, status) nulls not distinct',
      'create or replace function public.enqueue_enterprise_group_access_reconciliation(',
    ]),
  }),
]);

function fail(message) {
  throw new Error(message);
}

function appendGithubEnv(name, value) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

function validateReviewBoundary(review, rule) {
  if (!review.includes(`| ${rule.id} | \`${rule.name}\` | \`REQUIRES_SPLIT_REVIEW\``)) {
    fail(`Batch-L evidence no longer proves ${rule.id} as REQUIRES_SPLIT_REVIEW`);
  }
  for (const marker of rule.reviewMarkers) {
    if (!review.includes(marker)) fail(`Batch-L review marker drifted for ${rule.id}: ${marker}`);
  }
}

function validateDerivedPrerequisiteBoundary() {
  const batchH = readFileSync(batchHPath, 'utf8');
  const batchN = readFileSync(batchNPath, 'utf8');
  if (!batchH.includes(`| H11 | \`${derivedDependentName}\` | \`PENDING_DEPLOYMENT\``)) {
    fail('Batch-H evidence no longer proves H11 pending-deployment classification');
  }
  if (!batchN.includes('| N9 | `20260724200000_enterprise_access_operations_center.sql` | `PENDING_DEPLOYMENT` | **PREREQUISITE_BLOCKED')) {
    fail('Batch-N evidence no longer proves N9 prerequisite-blocked execution boundary');
  }
  if (!batchN.includes('prerequisiteBlockedExecutionAuthorized = false')) {
    fail('Batch-N evidence no longer preserves prerequisite-blocked execution denial');
  }
  if (!existsSync(derivedDependentPath) || existsSync(derivedHeldPath)) {
    fail('H11 derived prerequisite hold paths are not in the expected state');
  }
  const sql = readFileSync(derivedDependentPath, 'utf8');
  if (!sql.includes('on public.enterprise_access_operations')) {
    fail('H11 no longer depends on the N9 enterprise_access_operations relation');
  }
}

function stageBlockedRule(rule) {
  const path = join(root, 'supabase', 'migrations', rule.name);
  const bytes = readFileSync(path);
  const sql = bytes.toString('utf8');
  for (const marker of rule.sourceMarkers) {
    if (!sql.includes(marker)) fail(`${rule.id} historical migration marker drifted: ${marker}`);
  }

  const compatibilityMarkers = rule.sourceMarkers.map((marker) => `-- ${marker}\n`).join('');
  writeFileSync(
    path,
    `-- Disposable schema-effect replay only. ${rule.id} remains REQUIRES_SPLIT_REVIEW.\n`
      + compatibilityMarkers
      + '-- No production or canonical migration-history execution is authorized by this bridge.\n'
      + 'select 1;\n',
    'utf8',
  );
  return { path, bytes, name: rule.name };
}

function restoreHistoricalBytes(items) {
  const failures = [];
  for (const item of [...items].reverse()) {
    try {
      writeFileSync(item.path, item.bytes);
    } catch (error) {
      failures.push(`${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) fail(`Failed to restore split-review migration bytes: ${failures.join('; ')}`);
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Reviewed disposable schema boundary v2 is restricted to GitHub Actions');
  }

  const review = readFileSync(batchLPath, 'utf8');
  if (!review.includes('splitReviewItemsExecutionAuthorized = false')) {
    fail('Batch-L evidence no longer preserves the split-review execution block');
  }

  for (const rule of blockedRules) validateReviewBoundary(review, rule);
  validateDerivedPrerequisiteBoundary();

  const staged = [];
  let derivedHeld = false;
  let delegatedError = null;
  let restoreError = null;
  try {
    for (const rule of blockedRules) staged.push(stageBlockedRule(rule));
    renameSync(derivedDependentPath, derivedHeldPath);
    derivedHeld = true;
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    delegatedError = error;
  } finally {
    try {
      if (derivedHeld || existsSync(derivedHeldPath)) {
        if (!existsSync(derivedHeldPath) || existsSync(derivedDependentPath)) {
          fail('H11 derived prerequisite hold state drifted before restore');
        }
        renameSync(derivedHeldPath, derivedDependentPath);
      }
      restoreHistoricalBytes(staged);
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) throw restoreError;
  if (delegatedError) throw delegatedError;

  appendGithubEnv('RECOVERY_EPHEMERAL_SPLIT_REVIEW_BLOCKED_FILE_COUNT', String(blockedRules.length));
  appendGithubEnv('RECOVERY_EPHEMERAL_DERIVED_PREREQUISITE_BLOCKED_FILE_COUNT', '1');
  process.stdout.write(
    `Reviewed disposable schema boundary v2 preserved ${blockedRules.map((rule) => rule.id).join(', ')} as split-review blocked, held H11 behind prerequisite-blocked N9, and restored canonical historical bytes.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
