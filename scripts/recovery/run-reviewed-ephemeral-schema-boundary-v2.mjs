#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const batchIPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-i.md');
const batchLPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-l.md');
const batchHPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-h.md');
const batchNPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-n.md');
const delegate = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary.mjs');

const derivedRules = Object.freeze([
  Object.freeze({
    id: 'H11<-N9',
    name: '20260725180000_enterprise_access_operations_explicit_deny_policies.sql',
    heldSuffix: '.derived-prerequisite-blocked',
    sourceMarkers: Object.freeze(['on public.enterprise_access_operations']),
  }),
  Object.freeze({
    id: 'qualified-review-control-center<-I-DUP-13/N7',
    name: '20260727153000_qualified_review_control_center.sql',
    heldSuffix: '.derived-prerequisite-blocked',
    sourceMarkers: Object.freeze([
      'create or replace view public.qualified_review_control_center_v1',
      'from public.qualified_review_campaigns c',
      'left join public.qualified_review_assignments a',
    ]),
  }),
]);

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

function validateDerivedPrerequisiteBoundaries() {
  const batchH = readFileSync(batchHPath, 'utf8');
  const batchI = readFileSync(batchIPath, 'utf8');
  const batchN = readFileSync(batchNPath, 'utf8');

  if (!batchH.includes('| H11 | `20260725180000_enterprise_access_operations_explicit_deny_policies.sql` | `PENDING_DEPLOYMENT`')) {
    fail('Batch-H evidence no longer proves H11 pending-deployment classification');
  }
  if (!batchN.includes('| N9 | `20260724200000_enterprise_access_operations_center.sql` | `PENDING_DEPLOYMENT` | **PREREQUISITE_BLOCKED')) {
    fail('Batch-N evidence no longer proves N9 prerequisite-blocked execution boundary');
  }
  if (!batchI.includes('### I-DUP-13 — version `20260723223000`')
      || !batchI.includes('`20260723223000_qualified_review_consolidated.sql`')
      || !batchI.includes('classification for every Batch I item: `REQUIRES_SPLIT_REVIEW`')) {
    fail('Batch-I evidence no longer proves I-DUP-13 split-review boundary');
  }
  if (!batchN.includes('| N7 | `20260723170000_qualified_review_operations_platform.sql` | `PENDING_DEPLOYMENT` | **PREREQUISITE_BLOCKED')) {
    fail('Batch-N evidence no longer proves N7 prerequisite-blocked execution boundary');
  }
  if (!batchN.includes('prerequisiteBlockedExecutionAuthorized = false')) {
    fail('Batch-N evidence no longer preserves prerequisite-blocked execution denial');
  }

  for (const rule of derivedRules) {
    const path = join(root, 'supabase', 'migrations', rule.name);
    const heldPath = `${path}${rule.heldSuffix}`;
    if (!existsSync(path) || existsSync(heldPath)) {
      fail(`${rule.id} derived prerequisite hold paths are not in the expected state`);
    }
    const sql = readFileSync(path, 'utf8');
    for (const marker of rule.sourceMarkers) {
      if (!sql.includes(marker)) fail(`${rule.id} dependency marker drifted: ${marker}`);
    }
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

function holdDerivedRules() {
  const held = [];
  for (const rule of derivedRules) {
    const path = join(root, 'supabase', 'migrations', rule.name);
    const heldPath = `${path}${rule.heldSuffix}`;
    renameSync(path, heldPath);
    held.push({ ...rule, path, heldPath });
  }
  return held;
}

function restoreDerivedRules(items) {
  const failures = [];
  for (const item of [...items].reverse()) {
    try {
      if (!existsSync(item.heldPath) || existsSync(item.path)) {
        fail(`${item.id} derived prerequisite hold state drifted before restore`);
      }
      renameSync(item.heldPath, item.path);
    } catch (error) {
      failures.push(`${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) fail(`Failed to restore derived prerequisite migrations: ${failures.join('; ')}`);
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
  validateDerivedPrerequisiteBoundaries();

  const staged = [];
  let derivedHeld = [];
  let delegatedError = null;
  let restoreError = null;
  try {
    for (const rule of blockedRules) staged.push(stageBlockedRule(rule));
    derivedHeld = holdDerivedRules();
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    delegatedError = error;
  } finally {
    try {
      restoreDerivedRules(derivedHeld);
      restoreHistoricalBytes(staged);
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) throw restoreError;
  if (delegatedError) throw delegatedError;

  appendGithubEnv('RECOVERY_EPHEMERAL_SPLIT_REVIEW_BLOCKED_FILE_COUNT', String(blockedRules.length));
  appendGithubEnv('RECOVERY_EPHEMERAL_DERIVED_PREREQUISITE_BLOCKED_FILE_COUNT', String(derivedRules.length));
  process.stdout.write(
    `Reviewed disposable schema boundary v2 preserved ${blockedRules.map((rule) => rule.id).join(', ')} as split-review blocked, held ${derivedRules.map((rule) => rule.id).join(', ')} behind reviewed prerequisites, and restored canonical historical bytes.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
