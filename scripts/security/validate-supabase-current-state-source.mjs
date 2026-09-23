#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const RUN_ID = /^\d+$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const VERSION = /^\d{14}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateSupabaseCurrentProductionStateSource(
  evidence,
  { expectedSha, expectedRunId },
) {
  const sha = String(expectedSha ?? '').trim().toLowerCase();
  const runId = String(expectedRunId ?? '').trim();

  assert(FULL_SHA.test(sha), 'expected SHA is invalid');
  assert(RUN_ID.test(runId), 'expected current-state run ID is invalid');
  assert(evidence?.schema === 'risck-comply.supabase-current-production-state.v1', 'current-state schema is invalid');
  assert(evidence?.evidenceItem === 'supabase-current-production-state-read-only', 'current-state evidenceItem is invalid');
  assert(evidence?.status === 'Complete' && evidence?.outcome === 'passed', 'current-state authority must be Complete/passed');
  assert(evidence?.authorityMode === 'current_production_state_read_only', 'current-state authorityMode is invalid');
  assert(evidence?.targetSha === sha, 'current-state target SHA mismatch');
  assert(String(evidence?.githubActions?.runId ?? '') === runId, 'current-state source run ID mismatch');
  assert(evidence?.githubActions?.commitSha === sha, 'current-state GitHub commit SHA mismatch');
  assert(evidence?.githubActions?.branch === 'main', 'current-state GitHub branch must be main');
  assert(SHA256.test(String(evidence?.productionProjectDigest ?? '')), 'current-state Production project digest is invalid');

  const ledger = evidence?.migrationLedger;
  assert(Number.isInteger(ledger?.count) && ledger.count > 0, 'current-state migration ledger count is invalid');
  assert(VERSION.test(String(ledger?.head ?? '')), 'current-state migration ledger head is invalid');
  assert(SHA256.test(String(ledger?.sha256 ?? '')), 'current-state migration ledger digest is invalid');

  for (const check of [
    'exactShaBound',
    'productionEnvironmentGoverned',
    'productionProjectBound',
    'migrationLedgerCapturedReadOnly',
    'liveSchemaSecurityPostconditionsPassed',
    'livePostconditionsReadOnly',
    'liveTenantIsolationPassed',
    'liveTenantProofReadOnly',
    'forceRlsVerified',
    'crossTenantIsolationVerified',
    'noProductionMutation',
  ]) {
    assert(evidence?.checks?.[check] === true, `current-state check ${check} must pass`);
  }

  for (const check of [
    'dbPushPerformed',
    'migrationRepairPerformed',
    'manualLedgerInsertionPerformed',
    'historicalPromotionVerified',
    'humanReviewedMigrationBytesPromoted',
    'remoteAfterEqualsBeforePlusSelected',
    'backupRestoreProven',
  ]) {
    assert(evidence?.checks?.[check] === false, `current-state check ${check} must remain false`);
  }

  for (const field of [
    'containsSensitiveValues',
    'credentialsStored',
    'databaseUrlsStored',
    'rowDataStored',
    'userIdsStored',
    'organizationIdsStored',
  ]) {
    assert(evidence?.evidenceIntegrity?.[field] === false, `current-state evidence integrity ${field} must be false`);
  }

  return {
    status: 'Complete',
    outcome: 'passed',
    authorityMode: 'current_production_state_read_only',
    targetSha: sha,
    authorityRunId: runId,
    truthBoundary: evidence.truthBoundary,
  };
}

async function main(argv) {
  const [evidencePath, expectedSha, expectedRunId] = argv;
  assert(evidencePath && expectedSha && expectedRunId, 'usage: validate-supabase-current-state-source.mjs <evidence.json> <expected-sha> <run-id>');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  process.stdout.write(`${JSON.stringify(validateSupabaseCurrentProductionStateSource(evidence, { expectedSha, expectedRunId }))}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
