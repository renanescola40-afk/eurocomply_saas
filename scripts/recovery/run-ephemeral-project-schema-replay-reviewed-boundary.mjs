#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const blockedMigration = '20260721093000_enterprise_workflow_automation.sql';
const workflowReviewPath = 'docs/security/decisions/2026-08-10-supabase-human-review-mega-batch-f.md';
const helperReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-n.md';

const integrationMigration = '20260721113000_enterprise_integrations_platform.sql';
const tenantRelationsMigration = '20260721114500_enterprise_integrations_tenant_relations.sql';
const licensingFoundationMigration = '20260721193000_enterprise_tenant_licensing_core.sql';
const integrationReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-j.md';
const tenantRelationsReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-h.md';
const licensingReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-g.md';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const sourcePath = join(migrationsDir, blockedMigration);
const heldPath = join(migrationsDir, `${blockedMigration}.prerequisite-blocked`);

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

function validateReviewedBoundary() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Reviewed-boundary disposable replay is restricted to GitHub Actions');
  }

  assertPresent(sourcePath, 'prerequisite-blocked migration');
  assertAbsent(heldPath, 'prerequisite hold path');
  assertPresent(workflowReviewPath, 'workflow review evidence');
  assertPresent(helperReviewPath, 'membership-helper review evidence');

  const workflowReview = readFileSync(workflowReviewPath, 'utf8');
  const helperReview = readFileSync(helperReviewPath, 'utf8');
  const migrationSql = readFileSync(sourcePath, 'utf8');

  if (!workflowReview.includes(`\`${blockedMigration}\``) || !workflowReview.includes('PENDING_DEPLOYMENT')) {
    fail(`Reviewed classification boundary drifted for ${blockedMigration}`);
  }
  if (!helperReview.includes('public.is_organization_member(uuid)')
      || !helperReview.includes('PREREQUISITE_BLOCKED')
      || !helperReview.includes('canonical foundation')) {
    fail('Membership-helper prerequisite evidence no longer proves the unresolved boundary');
  }
  if (!migrationSql.includes('public.is_organization_member(organization_id)')) {
    fail(`${blockedMigration} no longer contains the reviewed unresolved helper dependency`);
  }

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

  if (!integrationReview.includes(`\`${integrationMigration}\``)
      || !integrationReview.includes('PENDING_DEPLOYMENT')
      || !integrationReview.includes('J9 → H10')) {
    fail('Enterprise integration review sequence evidence drifted');
  }
  if (!tenantRelationsReview.includes(`\`${tenantRelationsMigration}\``)
      || !tenantRelationsReview.includes('PENDING_DEPLOYMENT')) {
    fail('Tenant-relations review evidence drifted');
  }
  if (!licensingReview.includes(`\`${licensingFoundationMigration}\``)
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
  let integrationOrderStaged = false;

  renameSync(sourcePath, heldPath);
  try {
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
    if (!existsSync(heldPath)) fail(`Prerequisite hold artifact disappeared: ${heldPath}`);
    if (existsSync(sourcePath)) fail(`Prerequisite-blocked migration unexpectedly reappeared before restore: ${sourcePath}`);
    renameSync(heldPath, sourcePath);
  }

  if (replayError) throw replayError;
  process.stdout.write(
    `Disposable replay excluded ${blockedMigration} under reviewed unresolved-prerequisite evidence and replayed ${integrationMigration} → ${tenantRelationsMigration} immediately after ${licensingFoundationMigration}; canonical migration history remains unresolved.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
