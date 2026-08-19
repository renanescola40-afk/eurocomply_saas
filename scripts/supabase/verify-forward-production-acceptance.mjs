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
  const filename = String(item?.filename ?? '');
  const digest = normalizeDigest(item?.sha256);
  assert(/^\d{14}_[a-z0-9_]+\.sql$/.test(filename), `migration filename is invalid: ${filename || 'missing'}`);
  assert(SHA256.test(digest), `migration digest is invalid: ${filename}`);
  return `${filename}:${digest}`;
}

function validateManifest(manifest, targetSha) {
  assert(manifest?.schema === 'risck-comply.supabase-forward-reconciliation-manifest.v1', 'manifest schema is invalid');
  assert(manifest?.targetSha === targetSha, 'manifest target SHA mismatch');
  assert(SELECTION_DIGEST.test(String(manifest?.selectionDigest ?? '')), 'manifest selection digest is invalid');
  assert(Array.isArray(manifest?.migrations) && manifest.migrations.length > 0, 'manifest selected migration set is empty');
  assert(manifest?.checks?.productionWriteAuthorized === false, 'manifest must remain non-authorizing');
  assert(manifest?.checks?.migrationHistoryRepairAuthorized === false, 'manifest must forbid migration-history repair');
  assert(manifest?.checks?.unrestrictedDbPushAuthorized === false, 'manifest must forbid unrestricted db push');

  const keys = manifest.migrations.map(migrationKey);
  assert(new Set(keys).size === keys.length, 'manifest contains duplicate selected migration bytes');
  return {
    selectionDigest: manifest.selectionDigest,
    keys: [...keys].sort(),
    versions: normalizeVersions(manifest.migrations.map((item) => item?.version), 'manifest migration versions'),
    count: manifest.migrations.length,
  };
}

function validateHumanApproval(proof, targetSha, manifestIdentity) {
  assert(proof?.schema === 'risck-comply.supabase-forward-human-approval-proof.v1', 'human approval proof schema is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'human approval proof is not Complete/passed');
  assert(proof?.targetSha === targetSha, 'human approval proof target SHA mismatch');
  assert(proof?.selectionDigest === manifestIdentity.selectionDigest, 'human approval selection digest mismatch');
  assert(proof?.selectedMigrationCount === manifestIdentity.count, 'human approval migration count mismatch');
  assert(proof?.checks?.acceptedHumanDecisionGate === true, 'human Decision Gate was not accepted');
  assert(proof?.checks?.everySelectedMigrationPendingDeployment === true, 'not every selected migration has accepted PENDING_DEPLOYMENT review');
  assert(proof?.checks?.exactSelectedBytesCovered === true, 'human approval does not cover the exact selected bytes');
  assert(proof?.checks?.reviewerProvenancePresent === true, 'human reviewer provenance is incomplete');
  assert(proof?.checks?.schemaEvidenceReferencesPresent === true, 'human schema evidence references are incomplete');
  assert(proof?.checks?.rollbackReferencesPresent === true, 'human rollback references are incomplete');
  assert(proof?.checks?.productionWriteAuthorizedByDecisionGate === false, 'human Decision Gate must remain non-authorizing');
  assert(Array.isArray(proof?.migrations), 'human approval migration list is missing');
  const humanKeys = proof.migrations.map(migrationKey).sort();
  assert(JSON.stringify(humanKeys) === JSON.stringify(manifestIdentity.keys), 'human-reviewed migration bytes differ from the selected manifest');
  assert(proof?.evidenceIntegrity?.containsSensitiveValues === false, 'human approval sensitive-value assertion is missing');
  assert(proof?.evidenceIntegrity?.credentialsStored === false, 'human approval proof stores credentials');
  assert(proof?.evidenceIntegrity?.databaseUrlsStored === false, 'human approval proof stores database URLs');
  assert(proof?.evidenceIntegrity?.rowDataStored === false, 'human approval proof stores row data');
  assert(proof?.evidenceIntegrity?.humanNamesStored === false, 'human approval proof stores human names');
  assert(proof?.evidenceIntegrity?.approvalReferenceStored === false, 'human approval proof stores approval references');
}

function validatePromotionTransition(proof, targetSha, manifestIdentity) {
  assert(proof?.schema === 'risck-comply.supabase-forward-reconciliation-promotion.v1', 'promotion transition schema is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'promotion transition is not Complete/passed');
  assert(proof?.targetSha === targetSha, 'promotion transition target SHA mismatch');
  assert(proof?.selectionDigest === manifestIdentity.selectionDigest, 'promotion transition selection digest mismatch');
  assert(proof?.selectedMigrationCount === manifestIdentity.count, 'promotion transition migration count mismatch');
  const applied = normalizeVersions(proof?.appliedVersions, 'promotion applied versions');
  assert(JSON.stringify(applied) === JSON.stringify(manifestIdentity.versions), 'promotion applied versions differ from the selected manifest');
  for (const check of [
    'exactShaBound',
    'selectedMigrationsAbsentBeforePromotion',
    'remoteHistoryPreserved',
    'appliedSetEqualsSelectedSet',
    'remoteAfterEqualsBeforePlusSelected',
  ]) assert(proof?.checks?.[check] === true, `promotion transition check ${check} must pass`);
  assert(proof?.checks?.unauthorizedMigrationApplied === false, 'promotion transition reports an unauthorized migration');
  assert(proof?.checks?.migrationHistoryRepairPerformed === false, 'promotion transition reports migration-history repair');
  assert(proof?.checks?.unrestrictedDbPushPerformed === false, 'promotion transition reports unrestricted db push');
  assert(proof?.evidenceIntegrity?.containsSensitiveValues === false, 'promotion evidence sensitive-value assertion is missing');
  assert(proof?.evidenceIntegrity?.credentialsStored === false, 'promotion evidence stores credentials');
  assert(proof?.evidenceIntegrity?.databaseUrlsStored === false, 'promotion evidence stores database URLs');
  assert(proof?.evidenceIntegrity?.rowDataStored === false, 'promotion evidence stores row data');
}

function validateLivePostconditions(proof, targetSha, selectionDigest) {
  assert(proof?.schema === 'risck-comply.supabase-forward-live-postconditions.v1', 'live postconditions schema is invalid');
  assert(proof?.evidenceItem === 'supabase-forward-live-postconditions', 'live postconditions evidenceItem is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'live postconditions are not Complete/passed');
  assert(proof?.targetSha === targetSha, 'live postconditions target SHA mismatch');
  assert(proof?.selectionDigest === selectionDigest, 'live postconditions selection digest mismatch');
  assert(proof?.readOnly === true, 'live postconditions must be read-only');
  assert(proof?.postconditions === 'forward_reconciliation_postconditions_passed', 'live postcondition identity is invalid');
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

function validateBackupRestore(proof, targetSha, recoveryRunId, promotedRemote, selectedMigrationCount) {
  assert(proof?.schema === 'risck-comply.backup-restore-evidence.v2', 'backup/restore evidence schema is invalid');
  assert(proof?.evidenceItem === 'backup-restore-tested', 'backup/restore evidenceItem is invalid');
  assert(proof?.status === 'Complete' && proof?.outcome === 'passed', 'backup/restore evidence is not Complete/passed');
  assert(proof?.targetSha === targetSha && proof?.observedSha === targetSha, 'backup/restore exact-SHA binding is invalid');
  assert(String(proof?.runId ?? '') === String(recoveryRunId), 'backup/restore run ID mismatch');
  assert(JSON.stringify(proof?.controlsVerified) === JSON.stringify(['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10']), 'backup/restore controlsVerified is invalid');
  for (const check of [
    'backupExists',
    'restoreExecuted',
    'dataIntegrity',
    'rlsAfterRestore',
    'rlsPoliciesPresent',
    'rpoMeasured',
    'rtoMeasured',
    'distinctDatabases',
    'protectedMainExecution',
    'exactShaBound',
    'sourceMigrationLedgerCaptured',
  ]) assert(proof?.checks?.[check] === true, `backup/restore check ${check} must pass`);
  assert(Number.isFinite(proof?.metrics?.rpoSeconds), 'backup/restore RPO must be numeric');
  assert(Number.isFinite(proof?.metrics?.rtoSeconds), 'backup/restore RTO must be numeric');

  const sourceLedger = proof?.integrity?.sourceMigrationLedger;
  assert(Number.isInteger(sourceLedger?.count) && sourceLedger.count > 0, 'backup/restore source migration ledger count is invalid');
  assert(VERSION.test(String(sourceLedger?.head ?? '')), 'backup/restore source migration ledger head is invalid');
  assert(SELECTION_DIGEST.test(String(sourceLedger?.sha256 ?? '')), 'backup/restore source migration ledger digest is invalid');
  assert(sourceLedger.count === promotedRemote.length, 'backup/restore source migration ledger count differs from promoted ledger');
  assert(sourceLedger.head === promotedRemote.at(-1), 'backup/restore source migration ledger head differs from promoted ledger');
  assert(sourceLedger.sha256 === canonicalLedgerDigest(promotedRemote), 'backup/restore source migration ledger digest differs from promoted ledger');

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
  assert(proof?.evidenceIntegrity?.migrationVersionsStored === false, 'backup/restore evidence must not store migration version lists');
  assert(proof?.evidenceIntegrity?.sourceMigrationLedgerDigestStored === true, 'backup/restore source migration ledger digest assertion is missing');
  assert(proof?.evidenceIntegrity?.restoredPostconditionOutputStored === false, 'backup/restore must not retain restored postcondition output');
  assert(Array.isArray(proof?.failures) && proof.failures.length === 0, 'backup/restore evidence contains failures');
}

export function verifyForwardProductionAcceptance({
  manifest,
  humanApproval,
  promotionTransition,
  livePostconditions,
  liveTenantProof,
  backupRestore,
  liveRemoteVersions,
  promotedRemoteAfter,
  releaseSha,
  promotionRunId,
  recoveryRunId,
  generatedAt = new Date().toISOString(),
}) {
  const targetSha = normalizeSha(releaseSha, 'release SHA');
  assert(/^\d+$/.test(String(promotionRunId ?? '')), 'promotion run ID is invalid');
  assert(/^\d+$/.test(String(recoveryRunId ?? '')), 'recovery run ID is invalid');

  const manifestIdentity = validateManifest(manifest, targetSha);
  const promotedRemote = normalizeVersions(promotedRemoteAfter, 'promotion remote-after migration versions');
  const liveRemote = normalizeVersions(liveRemoteVersions, 'fresh live remote migration versions');

  validateHumanApproval(humanApproval, targetSha, manifestIdentity);
  validatePromotionTransition(promotionTransition, targetSha, manifestIdentity);
  validateLivePostconditions(livePostconditions, targetSha, manifestIdentity.selectionDigest);
  validateLiveTenantProof(liveTenantProof, targetSha, manifestIdentity.selectionDigest);
  validateBackupRestore(backupRestore, targetSha, recoveryRunId, promotedRemote, manifestIdentity.count);

  assert(JSON.stringify(liveRemote) === JSON.stringify(promotedRemote), 'post-promotion migration drift detected');
  for (const selected of manifestIdentity.versions) {
    assert(liveRemote.includes(selected), `selected migration is absent from fresh live ledger: ${selected}`);
  }

  return {
    schema: 'risck-comply.supabase-forward-production-acceptance.v1',
    evidenceItem: 'supabase-forward-production-acceptance',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    targetSha,
    selectionDigest: manifestIdentity.selectionDigest,
    selectedMigrationCount: manifestIdentity.count,
    promotionRunId: String(promotionRunId),
    recoveryRunId: String(recoveryRunId),
    checks: {
      exactShaBound: true,
      humanDecisionGateAccepted: true,
      exactHumanReviewedBytesPromoted: true,
      remoteLedgerTransitionExact: true,
      postPromotionMigrationDriftAbsent: true,
      unauthorizedMigrationApplied: false,
      migrationHistoryRepairPerformed: false,
      unrestrictedDbPushPerformed: false,
      liveSchemaSecurityPostconditionsPassed: true,
      livePostconditionProofReadOnly: true,
      liveTenantIsolationPassed: true,
      liveTenantProofReadOnly: true,
      backupRestoreExactShaPassed: true,
      backupRestoreSourceLedgerMatchesPromotion: true,
      restoredForwardPostconditionsPassed: true,
      providerCredentialRevocationClaimed: false,
    },
    recoveryBoundary: {
      backupRestoreProven: true,
      sourceMigrationLedgerBoundToPromotion: true,
      restoredForwardPostconditionsProven: true,
      providerCredentialRevocationClaimed: false,
      note: 'Protected backup/restore is exact-SHA, its production-source migration-ledger digest matches the successful promotion ledger, and the canonical selected-set postconditions pass on the disposable restored database. Rotation/revocation of any previously exposed provider credential remains a separate provider-side evidence requirement.',
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
    truthBoundary: 'Complete proves that the exact human-reviewed bounded forward migration bytes were the exact bytes added to the production ledger, remain present without post-promotion migration drift, satisfy fresh read-only live schema/security postconditions, enforce live two-tenant authenticated SELECT isolation using existing actors only, and have protected backup/restore evidence whose production-source migration-ledger digest equals the promoted ledger and whose disposable restored database passes the canonical selected-set postconditions. It does not classify or repair the historical migration backlog and does not claim provider-side revocation of a previously exposed database credential.',
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function main(argv) {
  const [
    manifestPath,
    humanPath,
    promotionPath,
    postconditionsPath,
    tenantPath,
    backupRestorePath,
    liveRemotePath,
    promotedRemotePath,
    outputPath,
    releaseSha,
    promotionRunId,
    recoveryRunId,
  ] = argv;
  assert(
    manifestPath && humanPath && promotionPath && postconditionsPath && tenantPath && backupRestorePath
      && liveRemotePath && promotedRemotePath && outputPath && releaseSha && promotionRunId && recoveryRunId,
    'usage: verify-forward-production-acceptance.mjs <manifest.json> <human-approval.json> <promotion-transition.json> <live-postconditions.json> <live-tenant.json> <backup-restore.json> <live-remote.json> <promoted-remote-after.json> <output.json> <release-sha> <promotion-run-id> <recovery-run-id>',
  );

  const evidence = verifyForwardProductionAcceptance({
    manifest: await readJson(manifestPath),
    humanApproval: await readJson(humanPath),
    promotionTransition: await readJson(promotionPath),
    livePostconditions: await readJson(postconditionsPath),
    liveTenantProof: await readJson(tenantPath),
    backupRestore: await readJson(backupRestorePath),
    liveRemoteVersions: await readJson(liveRemotePath),
    promotedRemoteAfter: await readJson(promotedRemotePath),
    releaseSha,
    promotionRunId,
    recoveryRunId,
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: evidence.status, outcome: evidence.outcome, targetSha: evidence.targetSha, selectedMigrationCount: evidence.selectedMigrationCount })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
