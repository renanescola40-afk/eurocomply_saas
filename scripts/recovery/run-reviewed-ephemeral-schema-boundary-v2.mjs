#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const batchLPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-l.md');
const delegate = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary.mjs');

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

  const staged = [];
  let delegatedError = null;
  let restoreError = null;
  try {
    for (const rule of blockedRules) staged.push(stageBlockedRule(rule));
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    delegatedError = error;
  } finally {
    try {
      restoreHistoricalBytes(staged);
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) throw restoreError;
  if (delegatedError) throw delegatedError;

  appendGithubEnv('RECOVERY_EPHEMERAL_SPLIT_REVIEW_BLOCKED_FILE_COUNT', String(blockedRules.length));
  process.stdout.write(
    `Reviewed disposable schema boundary v2 preserved ${blockedRules.map((rule) => rule.id).join(', ')} as split-review blocked and restored canonical historical bytes.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
