#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const batchIPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-i.md');
const batchLPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-l.md');
const batchHPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-h.md');
const batchNPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-n.md');
const breakGlassDecisionPath = join(root, 'docs', 'security', 'decisions', '2026-08-13-enterprise-break-glass-unapplied-history.md');
const breakGlassHistoricalName = '20260727160000_enterprise_break_glass_governance.sql';
const breakGlassForwardSourceName = '20260813234000_reconcile_enterprise_break_glass_governance.sql';
const breakGlassForwardName = '20260822123548_v19_reconcile_enterprise_break_glass_governance.sql';
const breakGlassHistoricalPath = join(root, 'supabase', 'migrations', breakGlassHistoricalName);
const breakGlassHeldPath = `${breakGlassHistoricalPath}.unapplied-history-held`;
const breakGlassForwardPath = join(root, 'supabase', 'migrations', breakGlassForwardName);
const billingCatalogName = '20260727193000_enterprise_billing_catalog.sql';
const billingCatalogPath = join(root, 'supabase', 'migrations', billingCatalogName);
const addOnForwardName = '20260813124224_reconcile_organization_add_ons.sql';
const addOnForwardPath = join(root, 'supabase', 'migrations', addOnForwardName);
const addOnForwardReplayName = '20260727192950_reconcile_organization_add_ons.sql';
const addOnForwardReplayPath = join(root, 'supabase', 'migrations', addOnForwardReplayName);
const rlsHelperSourceName = '20260701150000_supabase_production_rls_proof_hardening.sql';
const rlsHelperSourcePath = join(root, 'supabase', 'migrations', rlsHelperSourceName);
const billingHelperBootstrapPath = join(root, 'supabase', 'migrations', '20260727192955_replay_billing_rls_helpers.sql');
const billingHelperCleanupPath = join(root, 'supabase', 'migrations', '20260727193005_cleanup_billing_rls_helpers.sql');
const replayContractPath = join(root, 'scripts', 'recovery', 'run-ephemeral-project-schema-replay.mjs');
const billingCatalogEvidencePath = join(root, 'docs', 'security', 'evidence', 'human-review', 'split-reviews', 'i-dup-16-live-object-evidence.md');
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
  Object.freeze({
    id: 'access-export-download-audit<-N14',
    name: '20260728100000_enterprise_access_export_download_audit.sql',
    heldSuffix: '.derived-prerequisite-blocked',
    sourceMarkers: Object.freeze([
      'alter table public.enterprise_access_export_jobs',
      'download_count integer not null default 0',
    ]),
  }),
  Object.freeze({
    id: 'qualified-review-evidence-handoff<-I-DUP-13/N7',
    name: '20260728103000_qualified_review_evidence_handoff.sql',
    heldSuffix: '.derived-prerequisite-blocked',
    sourceMarkers: Object.freeze([
      'references public.qualified_review_campaigns(id, organization_id)',
      'from public.qualified_review_assignments a',
      'using (public.is_organization_member(organization_id))',
    ]),
  }),
  Object.freeze({
    id: 'qualified-review-final-closeout<-I-DUP-13/N7',
    name: '20260730101500_qualified_review_final_technical_closeout.sql',
    heldSuffix: '.derived-prerequisite-blocked',
    sourceMarkers: Object.freeze([
      'references public.qualified_review_campaigns(id, organization_id)',
      'create table if not exists public.qualified_review_technical_closeouts',
      'using (public.is_organization_member(organization_id))',
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
  if (!batchN.includes('| N14 | `20260726150000_enterprise_access_runtime_slo.sql` | `PENDING_DEPLOYMENT` | **PREREQUISITE_BLOCKED')) {
    fail('Batch-N evidence no longer proves N14 prerequisite-blocked execution boundary');
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

function validateBreakGlassReplayBoundary() {
  if (!existsSync(breakGlassDecisionPath)) fail(`Missing Break-Glass replay decision: ${breakGlassDecisionPath}`);
  if (!existsSync(breakGlassHistoricalPath)) fail(`Missing Break-Glass historical migration: ${breakGlassHistoricalName}`);
  if (existsSync(breakGlassHeldPath)) fail(`Break-Glass historical hold path already exists: ${breakGlassHeldPath}`);
  if (!existsSync(breakGlassForwardPath)) fail(`Missing Break-Glass forward reconciliation: ${breakGlassForwardName}`);

  const decision = readFileSync(breakGlassDecisionPath, 'utf8');
  for (const marker of [
    breakGlassHistoricalName,
    breakGlassForwardSourceName,
    'unapplied historical schema-effect source',
    'RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL=false',
  ]) {
    if (!decision.includes(marker)) fail(`Break-Glass replay decision marker drifted: ${marker}`);
  }

  const forwardSql = readFileSync(breakGlassForwardPath, 'utf8');
  for (const marker of [
    'organization_members_organization_id_id_key',
    'enterprise_break_glass_requests_organization_id_id_key',
    'create table if not exists public.enterprise_break_glass_requests',
  ]) {
    if (!forwardSql.includes(marker)) fail(`Break-Glass forward reconciliation marker drifted: ${marker}`);
  }
}

function validateBillingCatalogReplayBoundary() {
  for (const [path, label] of [
    [billingCatalogPath, 'billing catalog migration'],
    [addOnForwardPath, 'organization add-on forward reconciliation'],
    [rlsHelperSourcePath, 'reviewed RLS helper source migration'],
    [replayContractPath, 'schema replay contract'],
    [billingCatalogEvidencePath, 'billing catalog split-review evidence'],
  ]) {
    if (!existsSync(path)) fail(`Missing ${label}: ${path}`);
  }
  for (const [path, label] of [
    [addOnForwardReplayPath, 'organization add-on forward replay path'],
    [billingHelperBootstrapPath, 'billing helper bootstrap replay path'],
    [billingHelperCleanupPath, 'billing helper cleanup replay path'],
  ]) {
    if (existsSync(path)) fail(`${label} already exists: ${path}`);
  }

  const billingCatalogSql = readFileSync(billingCatalogPath, 'utf8');
  if (!billingCatalogSql.includes('alter table public.organization_add_ons')
      || !billingCatalogSql.includes('create table if not exists public.add_ons')
      || !billingCatalogSql.includes("select public.app_rls_harden_backend_only_table('seat_usage')")) {
    fail('Billing catalog no longer proves its reviewed add-on/RLS prerequisites');
  }

  const addOnForwardSql = readFileSync(addOnForwardPath, 'utf8');
  for (const marker of [
    'create table if not exists public.organization_add_ons',
    'constraint organization_add_ons_unique_org_addon unique (organization_id, add_on_id)',
    'alter table public.organization_add_ons force row level security',
  ]) {
    if (!addOnForwardSql.includes(marker)) fail(`Organization add-on forward marker drifted: ${marker}`);
  }

  const replayContract = readFileSync(replayContractPath, 'utf8');
  if (!replayContract.includes("'20260613_organization_add_ons.sql': Object.freeze([")
      || !replayContract.includes("'supabase/migrations/20260813124224_reconcile_organization_add_ons.sql'")) {
    fail('Schema replay contract no longer proves canonical add-on schema-effect replacement');
  }

  const evidence = readFileSync(billingCatalogEvidencePath, 'utf8');
  if (!evidence.includes(billingCatalogName)
      || !evidence.includes('current add-on code and production use `organization_add_ons`')
      || !evidence.includes('Earlier RLS migrations define that helper but also explicitly remove it again.')
      || !evidence.includes('billing-catalog lineage is reconciled')) {
    fail('Billing catalog evidence no longer proves the reviewed helper/add-on dependency boundary');
  }

  const helperSource = readFileSync(rlsHelperSourcePath, 'utf8');
  for (const marker of [
    'create or replace function public.app_rls_table_exists(p_table_name text)',
    'create or replace function public.app_rls_has_column(p_table_name text, p_column_name text)',
    'create or replace function public.app_rls_drop_known_policies(p_table_name text, p_policy_names text[])',
    'create or replace function public.app_rls_harden_backend_only_table(p_table_name text)',
    'drop function if exists public.app_rls_harden_backend_only_table(text);',
    'drop function if exists public.app_rls_table_exists(text);',
  ]) {
    if (!helperSource.includes(marker)) fail(`Reviewed RLS helper source marker drifted: ${marker}`);
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

function holdBreakGlassHistoricalMigration() {
  renameSync(breakGlassHistoricalPath, breakGlassHeldPath);
  return true;
}

function restoreBreakGlassHistoricalMigration(held) {
  if (!held) return;
  if (!existsSync(breakGlassHeldPath) || existsSync(breakGlassHistoricalPath)) {
    fail('Break-Glass historical hold state drifted before restore');
  }
  renameSync(breakGlassHeldPath, breakGlassHistoricalPath);
}

function stageBillingCatalogReplayBoundary() {
  copyFileSync(addOnForwardPath, addOnForwardReplayPath);
  if (!readFileSync(addOnForwardPath).equals(readFileSync(addOnForwardReplayPath))) {
    fail('Organization add-on forward replay byte integrity mismatch');
  }

  const helperSource = readFileSync(rlsHelperSourcePath, 'utf8');
  const helperStart = helperSource.indexOf('create or replace function public.app_rls_table_exists(p_table_name text)');
  const helperEnd = helperSource.indexOf('create or replace function public.app_rls_harden_monitoring_preferences()', helperStart);
  if (helperStart < 0 || helperEnd <= helperStart) {
    fail('Unable to isolate reviewed billing RLS helper definitions');
  }
  const helperDefinitions = helperSource.slice(helperStart, helperEnd).trim();
  if (!helperDefinitions.includes('create or replace function public.app_rls_harden_backend_only_table(p_table_name text)')) {
    fail('Reviewed billing RLS helper extraction lost backend-only helper');
  }

  writeFileSync(
    billingHelperBootstrapPath,
    '-- Disposable schema-effect replay only: restore the exact reviewed helper lifecycle needed by the historical billing catalog.\n'
      + 'begin;\n\n'
      + helperDefinitions
      + '\n\ncommit;\n',
    'utf8',
  );
  writeFileSync(
    billingHelperCleanupPath,
    '-- Disposable schema-effect replay only: restore the historical post-helper schema shape.\n'
      + 'begin;\n'
      + 'drop function if exists public.app_rls_harden_backend_only_table(text);\n'
      + 'drop function if exists public.app_rls_harden_org_writable_table(text, text);\n'
      + 'drop function if exists public.app_rls_drop_known_policies(text, text[]);\n'
      + 'drop function if exists public.app_rls_has_column(text, text);\n'
      + 'drop function if exists public.app_rls_table_exists(text);\n'
      + 'commit;\n',
    'utf8',
  );
  return true;
}

function restoreBillingCatalogReplayBoundary(staged) {
  if (!staged) return;
  rmSync(billingHelperCleanupPath, { force: true });
  rmSync(billingHelperBootstrapPath, { force: true });
  rmSync(addOnForwardReplayPath, { force: true });
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
  validateBreakGlassReplayBoundary();
  validateBillingCatalogReplayBoundary();

  const staged = [];
  let derivedHeld = [];
  let breakGlassHeld = false;
  let billingCatalogBoundaryStaged = false;
  let delegatedError = null;
  let restoreError = null;
  try {
    for (const rule of blockedRules) staged.push(stageBlockedRule(rule));
    derivedHeld = holdDerivedRules();
    breakGlassHeld = holdBreakGlassHistoricalMigration();
    billingCatalogBoundaryStaged = stageBillingCatalogReplayBoundary();
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    delegatedError = error;
  } finally {
    try {
      restoreBillingCatalogReplayBoundary(billingCatalogBoundaryStaged);
      restoreBreakGlassHistoricalMigration(breakGlassHeld);
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
  appendGithubEnv('RECOVERY_EPHEMERAL_BREAK_GLASS_UNAPPLIED_EXCLUDED_FILE_COUNT', '1');
  appendGithubEnv('RECOVERY_EPHEMERAL_ADD_ON_FORWARD_REORDERED_FILE_COUNT', '1');
  appendGithubEnv('RECOVERY_EPHEMERAL_BILLING_HELPER_REPLAY_FILE_COUNT', '2');
  process.stdout.write(
    `Reviewed disposable schema boundary v2 preserved ${blockedRules.map((rule) => rule.id).join(', ')} as split-review blocked, held ${derivedRules.map((rule) => rule.id).join(', ')} behind reviewed prerequisites, excluded ${breakGlassHistoricalName} under its forward-reconciliation decision, replayed ${addOnForwardName} before ${billingCatalogName}, restored the exact reviewed billing RLS helper lifecycle around that catalog, and restored canonical historical bytes.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
