#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationName = '20260728190000_market_leadership_foundations.sql';
const migrationPath = join(root, 'supabase', 'migrations', migrationName);
const heldPath = `${migrationPath}.derived-prerequisite-blocked`;
const batchNPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-n.md');
const liveAclName = '20260804224915_live_security_definer_acl_hardening.sql';
const liveAclPath = join(root, 'supabase', 'migrations', liveAclName);
const legacyDeleteHardening = `-- This legacy RPC deletes from auth.users and must never be client-callable.
alter function public.delete_user_account(uuid)
  set search_path = pg_catalog, auth;
revoke all on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;`;
const legacyDeleteReplayCompatibility = `-- This legacy RPC deletes from auth.users and must never be client-callable.
-- Disposable replay compatibility: production contained this legacy RPC, while the
-- reproducible repository lineage does not create it. Harden it only when present.
do $legacy_delete_rpc$
begin
  if to_regprocedure('public.delete_user_account(uuid)') is not null then
    execute 'alter function public.delete_user_account(uuid) set search_path = pg_catalog, auth';
    execute 'revoke all on function public.delete_user_account(uuid) from public, anon, authenticated';
    execute 'grant execute on function public.delete_user_account(uuid) to service_role';
  end if;
end
$legacy_delete_rpc$;`;
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
  if (!existsSync(liveAclPath)) fail(`Missing live security-definer hardening migration: ${liveAclName}`);

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

  const liveAclSql = readFileSync(liveAclPath, 'utf8');
  const occurrences = liveAclSql.split(legacyDeleteHardening).length - 1;
  if (occurrences !== 1) {
    fail(`Expected one reviewed legacy delete-user hardening block, found ${occurrences}`);
  }
  for (const marker of [
    'revoke all on function public.is_org_member(uuid) from public, anon;',
    'alter function public.current_jwt_subject()',
    'revoke all on function public.prevent_client_notification_scope_change()',
  ]) {
    if (!liveAclSql.includes(marker)) fail(`Live ACL hardening marker drifted: ${marker}`);
  }
}

function main() {
  validateBoundary();
  const liveAclBytes = readFileSync(liveAclPath);
  const liveAclSql = liveAclBytes.toString('utf8');
  let held = false;
  let aclCompatibilityStaged = false;
  let replayError = null;
  let restoreError = null;

  try {
    renameSync(migrationPath, heldPath);
    held = true;
    writeFileSync(liveAclPath, liveAclSql.replace(legacyDeleteHardening, legacyDeleteReplayCompatibility), 'utf8');
    aclCompatibilityStaged = true;
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    replayError = error;
  } finally {
    try {
      if (aclCompatibilityStaged) writeFileSync(liveAclPath, liveAclBytes);
      if (held || existsSync(heldPath)) {
        if (!existsSync(heldPath) || existsSync(migrationPath)) {
          fail('Market-leadership hold state drifted before restore');
        }
        renameSync(heldPath, migrationPath);
      }
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) throw restoreError;
  if (replayError) throw replayError;

  appendGithubEnv('RECOVERY_EPHEMERAL_MARKET_LEADERSHIP_PREREQUISITE_BLOCKED_FILE_COUNT', '1');
  appendGithubEnv('RECOVERY_EPHEMERAL_OPTIONAL_LEGACY_RPC_HARDENING_FILE_COUNT', '1');
  process.stdout.write(
    `Disposable replay held ${migrationName} behind the unresolved public.is_organization_member(uuid) foundation, made the live-only delete_user_account hardening conditional on object presence, and restored canonical bytes.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
