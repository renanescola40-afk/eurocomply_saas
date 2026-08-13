#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationName = '20260724001000_enterprise_group_access_reconciliation.sql';
const migrationPath = join(root, 'supabase', 'migrations', migrationName);
const batchLPath = join(root, 'docs', 'security', 'evidence', 'human-review', 'supabase-migration-mega-batch-l.md');
const delegate = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary.mjs');
const functionMarker = 'create or replace function public.list_enterprise_group_access_reconciliation_candidates(';
const syntaxMarker = '  current_role text,';
const prerequisiteMarker = 'i.membership_id';

function fail(message) {
  throw new Error(message);
}

function appendGithubEnv(name, value) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Reviewed disposable schema boundary v2 is restricted to GitHub Actions');
  }

  const review = readFileSync(batchLPath, 'utf8');
  if (!review.includes(`| L13 | \`${migrationName}\``)
      || !review.includes('REQUIRES_SPLIT_REVIEW')
      || !review.includes('enterprise_scim_identities.membership_id')
      || !review.includes('splitReviewItemsExecutionAuthorized = false')) {
    fail('Batch-L evidence no longer proves the L13 split-review execution boundary');
  }

  const historicalBytes = readFileSync(migrationPath);
  const historicalSql = historicalBytes.toString('utf8');
  if (!historicalSql.includes(functionMarker)
      || !historicalSql.includes(syntaxMarker)
      || !historicalSql.includes(prerequisiteMarker)) {
    fail('L13 historical migration contract drifted from the reviewed split boundary');
  }

  let delegatedError = null;
  let restoreError = null;
  try {
    writeFileSync(
      migrationPath,
      `-- Disposable schema-effect replay only. L13 remains REQUIRES_SPLIT_REVIEW.\n`
        + `-- ${functionMarker}\n`
        + `-- ${syntaxMarker}\n`
        + `-- ${prerequisiteMarker}\n`
        + '-- The membership contract is unresolved, so this historical effect remains fail-closed.\n'
        + 'select 1;\n',
      'utf8',
    );
    execFileSync(process.execPath, [delegate], { stdio: 'inherit', env: process.env });
  } catch (error) {
    delegatedError = error;
  } finally {
    try {
      writeFileSync(migrationPath, historicalBytes);
    } catch (error) {
      restoreError = error;
    }
  }

  if (restoreError) throw restoreError;
  if (delegatedError) throw delegatedError;

  appendGithubEnv('RECOVERY_EPHEMERAL_SPLIT_REVIEW_BLOCKED_FILE_COUNT', '1');
  process.stdout.write('Reviewed disposable schema boundary v2 preserved L13 as split-review blocked and restored canonical historical bytes.\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
