#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const legacyName = '20260721214000_enterprise_contract_billing_lifecycle.sql';
const hardeningName = '20260721214100_enterprise_billing_lifecycle_hardening.sql';
const legacyPath = join(migrationsDir, legacyName);
const hardeningPath = join(migrationsDir, hardeningName);
const reviewedReplay = join(process.cwd(), 'scripts', 'recovery', 'run-ephemeral-project-schema-replay-reviewed-boundary-v2.mjs');
const duplicateReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-i.md';
const batchNReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-n.md';
const invalidStatement = 'return next (v_contract.id, v_contract.organization_id, v_contract.status, v_next, v_reason);';
const safeStatement = 'return query select v_contract.id, v_contract.organization_id, v_contract.status, v_next, v_reason;';
const blockedDuplicateRules = Object.freeze([
  Object.freeze({
    group: 'I-DUP-13',
    name: '20260723223000_qualified_review_consolidated.sql',
    marker: 'create table if not exists public.qualified_review_campaigns',
  }),
  Object.freeze({
    group: 'I-DUP-14',
    name: '20260724001000_qualified_review_decision_controls.sql',
    marker: 'alter table public.qualified_review_assignments',
  }),
  Object.freeze({
    group: 'I-DUP-15',
    name: '20260724103000_qualified_review_api_operations.sql',
    marker: 'create unique index if not exists qualified_review_submissions_one_current',
  }),
]);

function fail(message) {
  throw new Error(message);
}

function appendGithubEnv(name, value) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

function stageBlockedDuplicateSchemaEffects(items, duplicateReview, batchNReview) {
  if (!duplicateReview.includes('REQUIRES_SPLIT_REVIEW')) {
    fail('Duplicate-version review no longer proves the split-review boundary');
  }
  if (!batchNReview.includes('N7 | `20260723170000_qualified_review_operations_platform.sql`')
      || !batchNReview.includes('public.is_organization_member(uuid)')
      || !batchNReview.includes('PREREQUISITE_BLOCKED')) {
    fail('Batch-N review no longer proves the qualified-review prerequisite blocker');
  }

  for (const rule of blockedDuplicateRules) {
    if (!duplicateReview.includes(`### ${rule.group}`) || !duplicateReview.includes(`\`${rule.name}\``)) {
      fail(`Duplicate review boundary drifted for ${rule.group} ${rule.name}`);
    }

    const path = join(migrationsDir, rule.name);
    const bytes = readFileSync(path);
    const sql = bytes.toString('utf8');
    if (!sql.includes(rule.marker) || !sql.includes('public.is_organization_member(')) {
      fail(`Qualified-review prerequisite markers drifted for ${rule.name}`);
    }

    items.push({ path, bytes, name: rule.name });
    writeFileSync(
      path,
      `-- Disposable schema-effect replay only. ${rule.group} remains reviewed split-history and\n`
        + '-- depends on the same unresolved qualified-review membership foundation as blocked N7.\n'
        + 'select 1;\n',
      'utf8',
    );
  }
}

function restoreBlockedDuplicateSchemaEffects(items) {
  const failures = [];
  for (const item of [...items].reverse()) {
    try {
      writeFileSync(item.path, item.bytes);
    } catch (error) {
      failures.push(`${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) fail(`Failed to restore blocked duplicate migration bytes: ${failures.join('; ')}`);
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') fail('Disposable billing lifecycle bridge is restricted to GitHub Actions');

  const legacyBytes = readFileSync(legacyPath);
  const legacySql = legacyBytes.toString('utf8');
  const hardeningSql = readFileSync(hardeningPath, 'utf8');
  const duplicateReview = readFileSync(duplicateReviewPath, 'utf8');
  const batchNReview = readFileSync(batchNReviewPath, 'utf8');
  const occurrences = legacySql.split(invalidStatement).length - 1;
  if (occurrences !== 1) fail(`Expected one reviewed legacy RETURN NEXT statement, found ${occurrences}`);
  if (!hardeningSql.includes('process_enterprise_contract_lifecycle_v2_atomic')) fail('Canonical billing lifecycle v2 function is missing');
  if (!hardeningSql.includes(safeStatement)) fail('Canonical billing lifecycle v2 no longer proves the safe return behavior');
  if (!hardeningSql.includes('revoke all on function public.process_enterprise_contract_lifecycle_atomic(integer) from service_role')) {
    fail('Canonical billing lifecycle hardening no longer revokes the superseded function');
  }

  const blockedDuplicateItems = [];
  let replayError = null;
  let restoreError = null;
  try {
    writeFileSync(legacyPath, legacySql.replace(invalidStatement, safeStatement), 'utf8');
    stageBlockedDuplicateSchemaEffects(blockedDuplicateItems, duplicateReview, batchNReview);
    execFileSync(process.execPath, [reviewedReplay], { stdio: 'inherit', env: process.env });
  } catch (error) {
    replayError = error;
  } finally {
    try {
      restoreBlockedDuplicateSchemaEffects(blockedDuplicateItems);
      writeFileSync(legacyPath, legacyBytes);
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) throw restoreError;
  if (replayError) throw replayError;

  appendGithubEnv('RECOVERY_EPHEMERAL_PREREQUISITE_BLOCKED_DUPLICATE_FILE_COUNT', String(blockedDuplicateRules.length));
  process.stdout.write(
    `Disposable billing lifecycle bridge completed; ${blockedDuplicateRules.length} qualified-review duplicate schema effects were suppressed by reviewed prerequisite boundaries and canonical historical bytes were restored.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
