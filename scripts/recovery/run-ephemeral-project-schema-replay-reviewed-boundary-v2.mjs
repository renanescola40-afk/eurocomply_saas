#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const helperBlockedMigrations = Object.freeze([
  '20260721123000_gpai_third_party_model_governance.sql',
  '20260721133000_post_market_ai_incident_governance.sql',
]);
const batchNBlockedMigrations = Object.freeze([
  { id: 'N7', name: '20260723170000_qualified_review_operations_platform.sql' },
  { id: 'N8', name: '20260724113000_enterprise_reconciliation_operations.sql' },
  { id: 'N9', name: '20260724200000_enterprise_access_operations_center.sql' },
  { id: 'N10', name: '20260725102000_qualified_review_delivery_closeout.sql' },
  { id: 'N13', name: '20260726140000_qualified_reviewer_portal.sql' },
  { id: 'N14', name: '20260726150000_enterprise_access_runtime_slo.sql' },
  { id: 'N15', name: '20260726170000_enterprise_seat_concurrency_alerting.sql' },
]);
const prerequisiteBlockedMigrations = Object.freeze([
  ...helperBlockedMigrations,
  ...batchNBlockedMigrations.map(({ name }) => name),
]);
const batchFReviewPath = 'docs/security/decisions/2026-08-10-supabase-human-review-mega-batch-f.md';
const helperReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-n.md';

const friaMigration = '20260721143000_fria_fundamental_rights_governance.sql';
const friaUniqueIndexStatement =
  'create unique index if not exists ai_fria_assessments_org_id_id on public.ai_fria_assessments(organization_id,id);';
const friaEvidenceMarker = 'create table if not exists public.ai_fria_evidence (';

const integrationMigration = '20260721113000_enterprise_integrations_platform.sql';
const tenantRelationsMigration = '20260721114500_enterprise_integrations_tenant_relations.sql';
const licensingFoundationMigration = '20260721193000_enterprise_tenant_licensing_core.sql';
const integrationReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-j.md';
const tenantRelationsReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-h.md';
const licensingReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-g.md';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const friaSourcePath = join(migrationsDir, friaMigration);
const friaHeldPath = join(migrationsDir, `${friaMigration}.statement-reordered`);
const integrationSourcePath = join(migrationsDir, integrationMigration);
const integrationHeldPath = join(migrationsDir, `${integrationMigration}.dependency-reordered`);
const integrationReplayPath = join(migrationsDir, '20260721193001_enterprise_integrations_platform.sql');
const tenantRelationsSourcePath = join(migrationsDir, tenantRelationsMigration);
const tenantRelationsHeldPath = join(migrationsDir, `${tenantRelationsMigration}.dependency-reordered`);
const tenantRelationsReplayPath = join(migrationsDir, '20260721193002_enterprise_integrations_tenant_relations.sql');
const licensingFoundationPath = join(migrationsDir, licensingFoundationMigration);
const replayScript = join(process.cwd(), 'scripts', 'recovery', 'run-ephemeral-project-schema-replay.mjs');

function fail(message) {
  throw new Error(message);
}

function assertPresent(path, label) {
  if (!existsSync(path)) fail(`Missing ${label}: ${path}`);
}

function assertAbsent(path, label) {
  if (existsSync(path)) fail(`${label} already exists: ${path}`);
}

function assertSameBytes(leftPath, rightPath, label) {
  if (!readFileSync(leftPath).equals(readFileSync(rightPath))) {
    fail(`${label} byte integrity mismatch`);
  }
}

function blockedRecord(name) {
  return {
    name,
    sourcePath: join(migrationsDir, name),
    heldPath: join(migrationsDir, `${name}.prerequisite-blocked`),
  };
}

function validateFriaBoundary(batchFReview) {
  assertPresent(friaSourcePath, 'FRIA foundation migration');
  assertAbsent(friaHeldPath, 'FRIA historical-order hold path');
  if (!batchFReview.includes('F7 — `' + friaMigration + '`') || !batchFReview.includes('PENDING_DEPLOYMENT')) {
    fail('FRIA Batch-F classification evidence drifted');
  }

  const sql = readFileSync(friaSourcePath, 'utf8');
  const indexPosition = sql.indexOf(friaUniqueIndexStatement);
  const evidencePosition = sql.indexOf(friaEvidenceMarker);
  if (indexPosition < 0 || evidencePosition < 0) fail('FRIA reviewed statement markers are missing');
  if (indexPosition < evidencePosition) {
    fail('FRIA historical statement order changed; review the canonical source before disposable replay');
  }
  if (!sql.includes('foreign key (organization_id, assessment_id) references public.ai_fria_assessments(organization_id, id)')) {
    fail('FRIA migration no longer contains the reviewed composite assessment FK dependency');
  }
}

function validateReviewedBoundary() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Reviewed-boundary disposable replay is restricted to GitHub Actions');
  }

  assertPresent(batchFReviewPath, 'Batch-F review evidence');
  assertPresent(helperReviewPath, 'membership-helper review evidence');
  const batchFReview = readFileSync(batchFReviewPath, 'utf8');
  const helperReview = readFileSync(helperReviewPath, 'utf8');

  if (!helperReview.includes('public.is_organization_member(uuid)')
      || !helperReview.includes('PREREQUISITE_BLOCKED')
      || !helperReview.includes('canonical foundation')) {
    fail('Membership-helper prerequisite evidence no longer proves the unresolved boundary');
  }

  for (const name of helperBlockedMigrations) {
    const record = blockedRecord(name);
    assertPresent(record.sourcePath, 'prerequisite-blocked migration');
    assertAbsent(record.heldPath, 'prerequisite hold path');
    if (!batchFReview.includes('`' + name + '`') || !batchFReview.includes('PENDING_DEPLOYMENT')) {
      fail(`Batch-F owner classification boundary drifted for ${name}`);
    }
    if (!readFileSync(record.sourcePath, 'utf8').includes('public.is_organization_member(organization_id)')) {
      fail(`${name} no longer contains the reviewed unresolved membership-helper dependency`);
    }
  }

  for (const { id, name } of batchNBlockedMigrations) {
    const record = blockedRecord(name);
    assertPresent(record.sourcePath, 'Batch-N prerequisite-blocked migration');
    assertAbsent(record.heldPath, 'Batch-N prerequisite hold path');
    const reviewRow = helperReview
      .split('\n')
      .find((line) => line.includes(`| ${id} | \`${name}\``));
    if (!reviewRow || !reviewRow.includes('PENDING_DEPLOYMENT') || !reviewRow.includes('PREREQUISITE_BLOCKED')) {
      fail(`Batch-N effective execution boundary drifted for ${id} ${name}`);
    }
  }

  validateFriaBoundary(batchFReview);

  for (const [path, label] of [
    [integrationSourcePath, 'enterprise integration migration'],
    [tenantRelationsSourcePath, 'enterprise integration tenant-relations migration'],
    [licensingFoundationPath, 'enterprise licensing foundation migration'],
    [integrationReviewPath, 'enterprise integration review evidence'],
    [tenantRelationsReviewPath, 'tenant-relations review evidence'],
    [licensingReviewPath, 'licensing review evidence'],
  ]) {
    assertPresent(path, label);
  }
  for (const [path, label] of [
    [integrationHeldPath, 'enterprise integration hold path'],
    [tenantRelationsHeldPath, 'tenant-relations hold path'],
    [integrationReplayPath, 'enterprise integration replay path'],
    [tenantRelationsReplayPath, 'tenant-relations replay path'],
  ]) {
    assertAbsent(path, label);
  }

  const integrationReview = readFileSync(integrationReviewPath, 'utf8');
  const tenantRelationsReview = readFileSync(tenantRelationsReviewPath, 'utf8');
  const licensingReview = readFileSync(licensingReviewPath, 'utf8');
  const integrationSql = readFileSync(integrationSourcePath, 'utf8');
  const licensingSql = readFileSync(licensingFoundationPath, 'utf8');

  if (!integrationReview.includes('`' + integrationMigration + '`')
      || !integrationReview.includes('PENDING_DEPLOYMENT')
      || !integrationReview.includes('J9 → H10')) {
    fail('Enterprise integration review sequence evidence drifted');
  }
  if (!tenantRelationsReview.includes('`' + tenantRelationsMigration + '`')
      || !tenantRelationsReview.includes('PENDING_DEPLOYMENT')) {
    fail('Tenant-relations review evidence drifted');
  }
  if (!licensingReview.includes('`' + licensingFoundationMigration + '`')
      || !licensingReview.includes('Foundation for contract-backed licensing')) {
    fail('Licensing foundation review evidence drifted');
  }
  if (!integrationSql.includes("coalesce(om.status, 'active') = 'active'")) {
    fail('Enterprise integration migration no longer contains the reviewed organization_members.status dependency');
  }
  if (!licensingSql.includes("add column if not exists status text not null default 'active'")) {
    fail('Licensing foundation no longer creates organization_members.status');
  }
}

function stageBlockedMigrations() {
  const records = prerequisiteBlockedMigrations.map(blockedRecord);
  for (const record of records) renameSync(record.sourcePath, record.heldPath);
  return records;
}

function restoreBlockedMigrations(records) {
  for (const record of [...records].reverse()) {
    if (!existsSync(record.heldPath)) fail(`Prerequisite hold artifact disappeared: ${record.heldPath}`);
    if (existsSync(record.sourcePath)) fail(`Prerequisite-blocked migration unexpectedly reappeared before restore: ${record.sourcePath}`);
    renameSync(record.heldPath, record.sourcePath);
  }
}

function stageFriaStatementOrder() {
  const originalSql = readFileSync(friaSourcePath, 'utf8');
  renameSync(friaSourcePath, friaHeldPath);

  const withoutIndex = originalSql.replace(`${friaUniqueIndexStatement}\n`, '');
  if (withoutIndex === originalSql) fail('FRIA unique-index statement could not be isolated');
  const evidencePosition = withoutIndex.indexOf(friaEvidenceMarker);
  if (evidencePosition < 0) fail('FRIA evidence-table marker disappeared during disposable rewrite');

  const replaySql = `${withoutIndex.slice(0, evidencePosition)}${friaUniqueIndexStatement}\n${withoutIndex.slice(evidencePosition)}`;
  if (replaySql.indexOf(friaUniqueIndexStatement) > replaySql.indexOf(friaEvidenceMarker)) {
    fail('FRIA disposable statement reorder failed');
  }
  writeFileSync(friaSourcePath, replaySql, 'utf8');
}

function restoreFriaStatementOrder() {
  if (existsSync(friaSourcePath)) rmSync(friaSourcePath, { force: true });
  if (!existsSync(friaHeldPath)) fail(`FRIA historical-order hold artifact disappeared: ${friaHeldPath}`);
  renameSync(friaHeldPath, friaSourcePath);
}

function stageReviewedReplayOrder() {
  renameSync(integrationSourcePath, integrationHeldPath);
  renameSync(tenantRelationsSourcePath, tenantRelationsHeldPath);
  copyFileSync(integrationHeldPath, integrationReplayPath);
  copyFileSync(tenantRelationsHeldPath, tenantRelationsReplayPath);
  assertSameBytes(integrationHeldPath, integrationReplayPath, integrationMigration);
  assertSameBytes(tenantRelationsHeldPath, tenantRelationsReplayPath, tenantRelationsMigration);
}

function restoreReviewedReplayOrder() {
  if (existsSync(integrationReplayPath)) rmSync(integrationReplayPath, { force: true });
  if (existsSync(tenantRelationsReplayPath)) rmSync(tenantRelationsReplayPath, { force: true });

  if (!existsSync(integrationHeldPath)) fail(`Enterprise integration hold artifact disappeared: ${integrationHeldPath}`);
  if (!existsSync(tenantRelationsHeldPath)) fail(`Tenant-relations hold artifact disappeared: ${tenantRelationsHeldPath}`);
  if (existsSync(integrationSourcePath)) fail(`Enterprise integration source unexpectedly reappeared before restore: ${integrationSourcePath}`);
  if (existsSync(tenantRelationsSourcePath)) fail(`Tenant-relations source unexpectedly reappeared before restore: ${tenantRelationsSourcePath}`);

  renameSync(integrationHeldPath, integrationSourcePath);
  renameSync(tenantRelationsHeldPath, tenantRelationsSourcePath);
}

function main() {
  validateReviewedBoundary();
  let replayError = null;
  let blockedRecords = [];
  let friaOrderStaged = false;
  let integrationOrderStaged = false;

  try {
    blockedRecords = stageBlockedMigrations();
    stageFriaStatementOrder();
    friaOrderStaged = true;
    stageReviewedReplayOrder();
    integrationOrderStaged = true;
    execFileSync(process.execPath, [replayScript], {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    replayError = error;
  } finally {
    if (integrationOrderStaged || existsSync(integrationHeldPath) || existsSync(tenantRelationsHeldPath)) {
      restoreReviewedReplayOrder();
    }
    if (friaOrderStaged || existsSync(friaHeldPath)) restoreFriaStatementOrder();
    if (blockedRecords.length) restoreBlockedMigrations(blockedRecords);
  }

  if (replayError) throw replayError;
  process.stdout.write(
    `Disposable replay excluded ${blockedRecords.length} reviewed prerequisite-blocked migrations, replayed FRIA F7 with its existing unique-index statement moved before dependent FKs, and replayed ${integrationMigration} → ${tenantRelationsMigration} immediately after ${licensingFoundationMigration}; canonical migration history remains unresolved.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
