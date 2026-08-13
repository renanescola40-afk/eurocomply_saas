#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const blockedMigration = '20260721093000_enterprise_workflow_automation.sql';
const workflowReviewPath = 'docs/security/decisions/2026-08-10-supabase-human-review-mega-batch-f.md';
const helperReviewPath = 'docs/security/evidence/human-review/supabase-migration-mega-batch-n.md';
const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const sourcePath = join(migrationsDir, blockedMigration);
const heldPath = join(migrationsDir, `${blockedMigration}.prerequisite-blocked`);
const replayScript = join(process.cwd(), 'scripts', 'recovery', 'run-ephemeral-project-schema-replay.mjs');

function fail(message) {
  throw new Error(message);
}

function validateReviewedBoundary() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Reviewed-boundary disposable replay is restricted to GitHub Actions');
  }
  if (!existsSync(sourcePath)) fail(`Missing prerequisite-blocked migration: ${blockedMigration}`);
  if (existsSync(heldPath)) fail(`Prerequisite hold path already exists: ${heldPath}`);
  if (!existsSync(workflowReviewPath)) fail(`Missing workflow review evidence: ${workflowReviewPath}`);
  if (!existsSync(helperReviewPath)) fail(`Missing membership-helper review evidence: ${helperReviewPath}`);

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
}

function main() {
  validateReviewedBoundary();
  let replayError = null;
  renameSync(sourcePath, heldPath);
  try {
    execFileSync(process.execPath, [replayScript], {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    replayError = error;
  } finally {
    if (!existsSync(heldPath)) fail(`Prerequisite hold artifact disappeared: ${heldPath}`);
    if (existsSync(sourcePath)) fail(`Prerequisite-blocked migration unexpectedly reappeared before restore: ${sourcePath}`);
    renameSync(heldPath, sourcePath);
  }
  if (replayError) throw replayError;
  process.stdout.write(`Disposable replay excluded ${blockedMigration} under reviewed unresolved-prerequisite evidence; canonical migration history remains unresolved.\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
