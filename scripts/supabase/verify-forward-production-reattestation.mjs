#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SELECTION_DIGEST = /^sha256:[a-f0-9]{64}$/;
const VERSION = /^\d{14}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeSha(value, label = 'SHA') {
  const normalized = String(value ?? '').trim().toLowerCase();
  assert(FULL_SHA.test(normalized), `${label} is invalid`);
  return normalized;
}

function normalizeDigest(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

function normalizeVersions(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  const versions = value.map((item) => String(item ?? '').trim());
  for (const version of versions) assert(VERSION.test(version), `${label} contains invalid migration version ${version}`);
  assert(new Set(versions).size === versions.length, `${label} contains duplicate migration versions`);
  return [...versions].sort();
}

function canonicalLedgerDigest(versions) {
  return `sha256:${createHash('sha256').update(JSON.stringify(versions)).digest('hex')}`;
}

function migrationKey(item) {
  const version = String(item?.version ?? '');
  const filename = String(item?.filename ?? '');
  const digest = normalizeDigest(item?.sha256);
  assert(VERSION.test(version), `migration version is invalid: ${version || 'missing'}`);
  assert(/^\d{14}_[a-z0-9_]+\.sql$/.test(filename), `migration filename is invalid: ${filename || 'missing'}`);
  assert(filename.startsWith(`${version}_`), `migration filename/version mismatch: ${filename}`);
  assert(SHA256.test(digest), `migration digest is invalid: ${filename}`);
  return `${version}:${filename}:${digest}`;
}

function validateManifest(manifest, expectedSha, label) {
  const targetSha = normalizeSha(expectedSha, `${label} SHA`);
  assert(manifest?.schema === 'risck-comply.supabase-forward-reconciliation-manifest.v1', `${label} manifest schema is invalid`);
  assert(manifest?.targetSha === targetSha, `${label} manifest target SHA mismatch`);
  assert(SELECTION_DIGEST.test(String(manifest?.selectionDigest ?? '')), `${label} selection digest is invalid`);
  assert(typeof manifest?.changeSet === 'string' && manifest.changeSet.length > 0, `${label} changeSet is invalid`);
  assert(Array.isArray(manifest?.migrations) && manifest.migrations.length > 0, `${label} migration set is empty`);
  assert(manifest?.checks?.productionWriteAuthorized === false, `${label} manifest must remain non-authorizing`);
  assert(manifest?.checks?.migrationHistoryRepairAuthorized === false, `${label} manifest must forbid migration-history repair`);
  assert(manifest?.checks?.unrestrictedDbPushAuthorized === false, `${label} manifest must forbid unrestricted db push`);
  const keys = manifest.migrations.map(migrationKey).sort();
  assert(new Set(keys).size === keys.length, `${label} manifest contains duplicate migration bytes`);
  return {
    targetSha,
    selectionDigest: manifest.selectionDigest,
    changeSet: manifest.changeSet,
    keys,
    versions: normalizeVersions(manifest.migrations.map((item) => item.version), `${label} migration versions`),
    count: manifest.migrations.length,
  };
}

function validateBaselinePromotion(proof, baselineIdentity) {
  assert(proof?.schema === 'risck-comply.supabase-forward-reconciliation-promotion.v1', 'baseline promotion schema is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'baseline promotion is not Complete/passed');
  assert(proof?.targetSha === baselineIdentity.targetSha, 'baseline promotion target SHA mismatch');
  assert(proof?.selectionDigest === baselineIdentity.selectionDigest, 'baseline promotion selection digest mismatch');
  assert(proof?.selectedMigrationCount === baselineIdentity.count, 'baseline promotion migration count mismatch');
  const applied = normalizeVersions(proof?.appliedVersions, 'baseline promotion applied versions');
  assert(JSON.stringify(applied) === JSON.stringify(baselineIdentity.versions), 'baseline promotion applied versions differ from baseline manifest');
  for (const check of [
    'exactShaBound',
    'selectedMigrationsAbsentBeforePromotion',
    'remoteHistoryPreserved',
    'appliedSetEqualsSelectedSet',
    'remoteAfterEqualsBeforePlusSelected',
  ]) assert(proof?.checks?.[check] === true, `baseline promotion check ${check} must pass`);
  assert(proof?.checks?.unauthorizedMigrationApplied === false, 'baseline promotion reports unauthorized migration');
  assert(proof?.checks?.migrationHistoryRepairPerformed === false, 'baseline promotion reports migration-history repair');
  assert(proof?.checks?.unrestrictedDbPushPerformed === false, 'baseline promotion reports unrestricted db push');
  assert(proof?.evidenceIntegrity?.containsSensitiveValues === false, 'baseline promotion sensitive-value assertion is missing');
}

function validateBaselineHumanApproval(proof, baselineIdentity) {
  assert(proof?.schema === 'risck-comply.supabase-forward-human-approval-proof.v1', 'baseline human approval schema is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'baseline human approval is not Complete/passed');
  assert(proof?.targetSha === baselineIdentity.targetSha, 'baseline human approval target SHA mismatch');
  assert(proof?.selectionDigest === baselineIdentity.selectionDigest, 'baseline human approval selection digest mismatch');
  assert(proof?.selectedMigrationCount === baselineIdentity.count, 'baseline human approval migration count mismatch');
  for (const check of [
    'acceptedHumanDecisionGate',
    'everySelectedMigrationPendingDeployment',
    'exactSelectedBytesCovered',
    'reviewerProvenancePresent',
    'schemaEvidenceReferencesPresent',
    'rollbackReferencesPresent',
  ]) assert(proof?.checks?.[check] === true, `baseline human approval check ${check} must pass`);
  assert(proof?.checks?.productionWriteAuthorizedByDecisionGate === false, 'baseline Decision Gate must remain non-authorizing');
  assert(Array.isArray(proof?.migrations), 'baseline human approval migration list is missing');
  assert(JSON.stringify(proof.migrations.map(migrationKey).sort()) === JSON.stringify(baselineIdentity.keys), 'baseline human-reviewed migration bytes differ from baseline manifest');
  assert(proof?.evidenceIntegrity?.containsSensitiveValues === false, 'baseline human approval sensitive-value assertion is missing');
}

function validateLivePostconditions(proof, targetSha, selectionDigest) {
  assert(proof?.schema === 'risck-comply.supabase-forward-live-postconditions.v1', 'live postconditions schema is invalid');
  assert(proof?.evidenceItem === 'supabase-forward-live-postconditions', 'live postconditions evidenceItem is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'live postconditions are not Complete/passed');
  assert(proof?.targetSha === targetSha, 'live postconditions target SHA mismatch');
  assert(proof?.selectionDigest === selectionDigest, 'live postconditions selection digest mismatch');
  assert(proof?.readOnly === true, 'live postconditions must be read-only');
  assert(proof?.postconditions === 'forward_reconciliation_and_cross_tenant_reference_postconditions_passed', 'live postcondition identity is invalid');
  assert(proof?.evidenceIntegrity?.containsSensitiveValues === false, 'live postconditions sensitive-value assertion is missing');
  assert(proof?.evidenceIntegrity?.databaseUrlsStored === false, 'live postconditions store database URLs');
  assert(proof?.evidenceIntegrity?.rowDataStored === false, 'live postconditions store row data');
}

function validateLiveTenantProof(proof, targetSha, selectionDigest) {
  assert(proof?.schema === 'risck-comply.supabase-live-tenant-isolation.v1', 'live tenant proof schema is invalid');
  assert(proof?.evidenceItem === 'supabase-live-tenant-isolation', 'live tenant proof evidenceItem is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'live tenant proof is not Complete/passed');
  assert(proof?.targetSha === targetSha, 'live tenant proof target SHA mismatch');
  assert(proof?.selectionDigest === selectionDigest, 'live tenant proof selection digest mismatch');
  assert(proof?.readOnly === true, 'live tenant proof must be read-only');
  for (const check of [
    'transactionReadOnly',
    'isolatedExistingActorPairFound',
    'canonicalOrganizationRlsForceRls',
    'evidenceVaultRlsForceRls',
    'evidenceStoragePoliciesCanonical',
    'actorAOwnOrganizationVisible',
    'actorAForeignOrganizationHidden',
    'actorAOwnMembershipVisible',
    'actorAForeignMembershipHidden',
    'actorBOwnOrganizationVisible',
    'actorBForeignOrganizationHidden',
    'actorBOwnMembershipVisible',
    'actorBForeignMembershipHidden',
    'noProductionMutation',
  ]) assert(proof?.checks?.[check] === true, `live tenant isolation check ${check} must pass`);
  assert(proof?.evidenceIntegrity?.containsSensitiveValues === false, 'live tenant proof sensitive-value assertion is missing');
  assert(proof?.evidenceIntegrity?.userIdsStored === false, 'live tenant proof stores user IDs');
  assert(proof?.evidenceIntegrity?.organizationIdsStored === false, 'live tenant proof stores organization IDs');
  assert(proof?.evidenceIntegrity?.rowDataStored === false, 'live tenant proof stores row data');
  assert(proof?.evidenceIntegrity?.databaseUrlsStored === false, 'live tenant proof stores database URLs');
}

function validateBackupRestore(proof, targetSha, recoveryRunId, liveRemote, selectedMigrationCount) {
  assert(proof?.schema === 'risck-comply.backup-restore-evidence.v2', 'backup/restore evidence schema is invalid');
  assert(proof?.evidenceItem === 'backup-restore-tested', 'backup/restore evidenceItem is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'backup/restore evidence must be Complete/passed');
  assert(proof?.targetSha === targetSha && proof?.observedSha === targetSha, 'backup/restore exact-SHA binding is invalid');
  assert(String(proof?.runId ?? '') === String(recoveryRunId), 'backup/restore run ID mismatch');
  for (const check of [
    'backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rlsPoliciesPresent',
    'rpoMeasured', 'rtoMeasured', 'distinctDatabases', 'protectedMainExecution', 'exactShaBound',
    'sourceMigrationLedgerCaptured',
  ]) assert(proof?.checks?.[check] === true, `backup/restore check ${check} must pass`);
  const sourceLedger = proof?.integrity?.sourceMigrationLedger;
  assert(Number.isInteger(sourceLedger?.count) && sourceLedger.count > 0, 'backup/restore source migration ledger count is invalid');
  assert(VERSION.test(String(sourceLedger?.head ?? '')), 'backup/restore source migration ledger head is invalid');
  assert(SELECTION_DIGEST.test(String(sourceLedger?.sha256 ?? '')), 'backup/restore source migration ledger digest is invalid');
  assert(sourceLedger.count === liveRemote.length, 'backup/restore source migration ledger count differs from live ledger');
  assert(sourceLedger.head === liveRemote.at(-1), 'backup/restore source migration ledger head differs from live ledger');
  assert(sourceLedger.sha256 === canonicalLedgerDigest(liveRemote), 'backup/restore source migration ledger digest differs from live ledger');
  const forward = proof?.forwardReconciliation;
  assert(forward && typeof forward === 'object' && !Array.isArray(forward), 'backup/restore forward reconciliation evidence is missing');
  assert(forward.selectedForwardMigrationCount === selectedMigrationCount, 'backup/restore selected forward migration count mismatch');
  assert(forward.selectedForwardSetPresentInSource === true, 'backup/restore source did not contain the complete selected forward set');
  assert(forward.restoredPostconditionsExecuted === true, 'backup/restore did not execute restored forward postconditions');
  assert(forward.restoredPostconditionsPassed === true, 'backup/restore restored forward postconditions did not pass');
  assert(proof?.evidenceIntegrity?.containsSensitiveValues === false, 'backup/restore sensitive-value assertion is missing');
  assert(proof?.evidenceIntegrity?.databaseUrlsStored === false, 'backup/restore evidence stores database URLs');
  assert(proof?.evidenceIntegrity?.dumpStored === false, 'backup/restore evidence stores database dumps');
  assert(proof?.evidenceIntegrity?.rowDataStored === false, 'backup/restore evidence stores row data');
  assert(Array.isArray(proof?.failures) && proof.failures.length === 0, 'backup/restore evidence contains failures');
}

export function verifyForwardProductionReattestation({
  currentManifest,
  baselineManifest,
  baselineHumanApproval,
  baselinePromotionTransition,
  livePostconditions,
  liveTenantProof,
  backupRestore,
  liveRemoteVersions,
  baselineRemoteAfter,
  releaseSha,
  baselinePromotionRunId,
  recoveryRunId,
  generatedAt = new Date().toISOString(),
}) {
  const targetSha = normalizeSha(releaseSha, 'release SHA');
  assert(/^\d+$/.test(String(baselinePromotionRunId ?? '')), 'baseline promotion run ID is invalid');
  assert(/^\d+$/.test(String(recoveryRunId ?? '')), 'recovery run ID is invalid');

  const current = validateManifest(currentManifest, targetSha, 'current');
  const baselineSha = normalizeSha(baselineManifest?.targetSha, 'baseline promotion SHA');
  const baseline = validateManifest(baselineManifest, baselineSha, 'baseline');
  assert(current.changeSet === baseline.changeSet, 'current changeSet differs from baseline promotion');
  assert(JSON.stringify(current.keys) === JSON.stringify(baseline.keys), 'current selected migration bytes differ from baseline promotion');
  assert(JSON.stringify(current.versions) === JSON.stringify(baseline.versions), 'current selected migration versions differ from baseline promotion');

  validateBaselineHumanApproval(baselineHumanApproval, baseline);
  validateBaselinePromotion(baselinePromotionTransition, baseline);

  const liveRemote = normalizeVersions(liveRemoteVersions, 'fresh live migration versions');
  const promotedRemote = normalizeVersions(baselineRemoteAfter, 'baseline promoted migration versions');
  assert(JSON.stringify(liveRemote) === JSON.stringify(promotedRemote), 'migration drift detected since baseline promotion');
  for (const selected of current.versions) assert(liveRemote.includes(selected), `selected migration is absent from live ledger: ${selected}`);

  validateLivePostconditions(livePostconditions, targetSha, current.selectionDigest);
  validateLiveTenantProof(liveTenantProof, targetSha, current.selectionDigest);
  validateBackupRestore(backupRestore, targetSha, recoveryRunId, liveRemote, current.count);

  return {
    schema: 'risck-comply.supabase-forward-production-acceptance.v1',
    evidenceItem: 'supabase-forward-production-acceptance',
    status: 'Complete',
    outcome: 'passed',
    acceptanceMode: 'read_only_reattestation',
    generatedAt,
    targetSha,
    selectionDigest: current.selectionDigest,
    selectedMigrationCount: current.count,
    baselinePromotionRunId: String(baselinePromotionRunId),
    baselinePromotionSha: baselineSha,
    recoveryRunId: String(recoveryRunId),
    checks: {
      exactShaBound: true,
      baselinePromotionWorkflowTrusted: true,
      baselineHumanDecisionGateAccepted: true,
      currentSelectedBytesEqualBaselinePromotedBytes: true,
      currentSelectedMigrationsPresentInLiveLedger: true,
      migrationDriftSinceBaselineAbsent: true,
      productionMutationPerformedByReattestation: false,
      migrationHistoryRepairPerformed: false,
      unrestrictedDbPushPerformed: false,
      liveSchemaSecurityPostconditionsPassed: true,
      livePostconditionProofReadOnly: true,
      liveTenantIsolationPassed: true,
      liveTenantProofReadOnly: true,
      backupRestoreExactShaPassed: true,
      backupRestoreSourceLedgerMatchesLive: true,
      restoredForwardPostconditionsPassed: true,
      providerCredentialRevocationClaimed: false,
    },
    recoveryBoundary: {
      backupRestoreProven: true,
      sourceMigrationLedgerBoundToFreshLiveLedger: true,
      restoredForwardPostconditionsProven: true,
      providerCredentialRevocationClaimed: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      rowDataStored: false,
      userIdsStored: false,
      organizationIdsStored: false,
      humanNamesStored: false,
      approvalReferenceStored: false,
      migrationVersionsStoredFromRecovery: false,
      restoredPostconditionOutputStored: false,
    },
    truthBoundary: 'Complete proves that the current release selects byte-identical migrations to a previously successful protected Production promotion, the fresh live migration ledger has not drifted from that baseline, canonical live schema/security and two-tenant isolation checks pass read-only, and exact-current-SHA provider-managed backup/restore evidence is bound to the fresh live ledger. This re-attestation performs no Production mutation, migration-history repair, or unrestricted db push.',
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function main(argv) {
  const [
    currentManifestPath,
    baselineManifestPath,
    baselineHumanPath,
    baselinePromotionPath,
    postconditionsPath,
    tenantPath,
    backupRestorePath,
    liveRemotePath,
    baselineRemotePath,
    outputPath,
    releaseSha,
    baselinePromotionRunId,
    recoveryRunId,
  ] = argv;
  assert(
    currentManifestPath && baselineManifestPath && baselineHumanPath && baselinePromotionPath
      && postconditionsPath && tenantPath && backupRestorePath && liveRemotePath && baselineRemotePath
      && outputPath && releaseSha && baselinePromotionRunId && recoveryRunId,
    'usage: verify-forward-production-reattestation.mjs <current-manifest.json> <baseline-manifest.json> <baseline-human-approval.json> <baseline-promotion.json> <live-postconditions.json> <live-tenant.json> <backup-restore.json> <live-remote.json> <baseline-remote-after.json> <output.json> <release-sha> <baseline-promotion-run-id> <recovery-run-id>',
  );

  const evidence = verifyForwardProductionReattestation({
    currentManifest: await readJson(currentManifestPath),
    baselineManifest: await readJson(baselineManifestPath),
    baselineHumanApproval: await readJson(baselineHumanPath),
    baselinePromotionTransition: await readJson(baselinePromotionPath),
    livePostconditions: await readJson(postconditionsPath),
    liveTenantProof: await readJson(tenantPath),
    backupRestore: await readJson(backupRestorePath),
    liveRemoteVersions: await readJson(liveRemotePath),
    baselineRemoteAfter: await readJson(baselineRemotePath),
    releaseSha,
    baselinePromotionRunId,
    recoveryRunId,
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: evidence.status, outcome: evidence.outcome, targetSha: evidence.targetSha, acceptanceMode: evidence.acceptanceMode })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
