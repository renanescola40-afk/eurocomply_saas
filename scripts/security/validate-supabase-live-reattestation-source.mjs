#!/usr/bin/env node

import { appendFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { loadForwardManifestContract } from './supabase-forward-manifest-contract.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const RUN_ID = /^\d+$/;
const SELECTION_DIGEST = /^sha256:[a-f0-9]{64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateSupabaseLiveReattestationSource(
  evidence,
  { expectedSha, expectedRunId, contract = loadForwardManifestContract() },
) {
  const sha = String(expectedSha ?? '').trim().toLowerCase();
  const runId = String(expectedRunId ?? '').trim();
  assert(FULL_SHA.test(sha), 'expected SHA is invalid');
  assert(RUN_ID.test(runId), 'expected reattestation run ID is invalid');

  assert(evidence?.schema === 'risck-comply.supabase-forward-production-acceptance.v1', 'reattestation schema is invalid');
  assert(evidence?.evidenceItem === 'supabase-forward-production-acceptance', 'reattestation evidenceItem is invalid');
  assert(evidence?.status === 'Complete' && evidence?.outcome === 'passed', 'reattestation must be Complete/passed');
  assert(evidence?.acceptanceMode === 'read_only_reattestation', 'reattestation acceptanceMode is invalid');
  assert(evidence?.targetSha === sha, 'reattestation target SHA mismatch');
  assert(SELECTION_DIGEST.test(String(evidence?.selectionDigest ?? '')), 'reattestation selection digest is invalid');
  assert(Number.isInteger(evidence?.selectedMigrationCount) && evidence.selectedMigrationCount > 0, 'reattestation migration count is invalid');
  assert(evidence.selectedMigrationCount === contract.count, 'reattestation migration count does not match current governed manifest');
  assert(RUN_ID.test(String(evidence?.baselinePromotionRunId ?? '')), 'baseline promotion run ID is invalid');
  assert(FULL_SHA.test(String(evidence?.baselinePromotionSha ?? '')), 'baseline promotion SHA is invalid');
  assert(RUN_ID.test(String(evidence?.recoveryRunId ?? '')), 'recovery run ID is invalid');

  for (const check of [
    'exactShaBound',
    'baselinePromotionWorkflowTrusted',
    'baselineHumanDecisionGateAccepted',
    'currentSelectedBytesEqualBaselinePromotedBytes',
    'currentSelectedMigrationsPresentInLiveLedger',
    'migrationDriftSinceBaselineAbsent',
    'liveSchemaSecurityPostconditionsPassed',
    'livePostconditionProofReadOnly',
    'liveTenantIsolationPassed',
    'liveTenantProofReadOnly',
    'backupRestoreExactShaPassed',
    'backupRestoreSourceLedgerMatchesLive',
    'restoredForwardPostconditionsPassed',
  ]) {
    assert(evidence?.checks?.[check] === true, `reattestation check ${check} must pass`);
  }

  for (const check of [
    'productionMutationPerformedByReattestation',
    'migrationHistoryRepairPerformed',
    'unrestrictedDbPushPerformed',
    'providerCredentialRevocationClaimed',
  ]) {
    assert(evidence?.checks?.[check] === false, `reattestation check ${check} must remain false`);
  }

  assert(evidence?.recoveryBoundary?.backupRestoreProven === true, 'backup/restore boundary is not proven');
  assert(evidence?.recoveryBoundary?.sourceMigrationLedgerBoundToFreshLiveLedger === true, 'recovery ledger is not bound to fresh live ledger');
  assert(evidence?.recoveryBoundary?.restoredForwardPostconditionsProven === true, 'restored forward postconditions are not proven');
  assert(evidence?.recoveryBoundary?.providerCredentialRevocationClaimed === false, 'provider credential revocation must not be inferred');

  for (const field of [
    'containsSensitiveValues',
    'credentialsStored',
    'databaseUrlsStored',
    'rowDataStored',
    'userIdsStored',
    'organizationIdsStored',
  ]) {
    assert(evidence?.evidenceIntegrity?.[field] === false, `reattestation evidence integrity ${field} must be false`);
  }

  return {
    status: 'Complete',
    outcome: 'passed',
    authorityMode: 'read_only_reattestation',
    targetSha: sha,
    authorityRunId: runId,
    baselinePromotionRunId: String(evidence.baselinePromotionRunId),
    recoveryRunId: String(evidence.recoveryRunId),
    promotionLineage: {
      promotionRunId: String(evidence.baselinePromotionRunId),
      changeSet: contract.changeSet,
      selectedMigrationCount: contract.count,
      selectionDigest: String(evidence.selectionDigest),
      manifestMatchVerified: true,
      remoteAfterEqualsBeforePlusSelected: true,
      unauthorizedMigrationApplied: false,
      productionPromotionVerified: true,
    },
  };
}

export function promotionLineageEnvLines(result) {
  const lineage = result?.promotionLineage;
  assert(lineage && typeof lineage === 'object', 'promotion lineage is missing');
  assert(RUN_ID.test(String(lineage.promotionRunId ?? '')), 'promotion lineage run ID is invalid');
  assert(String(lineage.changeSet ?? '').trim(), 'promotion lineage changeSet is invalid');
  assert(Number.isInteger(lineage.selectedMigrationCount) && lineage.selectedMigrationCount > 0, 'promotion lineage migration count is invalid');
  assert(SELECTION_DIGEST.test(String(lineage.selectionDigest ?? '')), 'promotion lineage selection digest is invalid');
  assert(lineage.manifestMatchVerified === true, 'promotion lineage manifest match is not proven');
  assert(lineage.remoteAfterEqualsBeforePlusSelected === true, 'promotion lineage remote transition is not proven');
  assert(lineage.unauthorizedMigrationApplied === false, 'promotion lineage reports an unauthorized migration');
  assert(lineage.productionPromotionVerified === true, 'promotion lineage baseline promotion is not verified');

  return [
    `PROMOTION_LINEAGE_RUN_ID=${lineage.promotionRunId}`,
    `PROMOTION_CHANGE_SET=${lineage.changeSet}`,
    `PROMOTION_SELECTED_MIGRATION_COUNT=${lineage.selectedMigrationCount}`,
    `PROMOTION_SELECTION_DIGEST=${lineage.selectionDigest}`,
    'PROMOTION_MANIFEST_MATCH_VERIFIED=true',
    'PROMOTION_REMOTE_TRANSITION_VERIFIED=true',
    'PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED=false',
    'PROMOTION_PRODUCTION_VERIFIED=true',
  ];
}

async function main(argv) {
  const [evidencePath, expectedSha, expectedRunId] = argv;
  assert(evidencePath && expectedSha && expectedRunId, 'usage: validate-supabase-live-reattestation-source.mjs <production-acceptance.json> <expected-sha> <reattestation-run-id>');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  const result = validateSupabaseLiveReattestationSource(evidence, { expectedSha, expectedRunId });
  const githubEnvPath = String(process.env.GITHUB_ENV ?? '').trim();
  if (githubEnvPath) appendFileSync(githubEnvPath, `${promotionLineageEnvLines(result).join('\n')}\n`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
