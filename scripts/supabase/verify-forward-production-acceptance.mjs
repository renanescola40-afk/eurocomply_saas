#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeSha(value) {
  const sha = String(value ?? '').trim().toLowerCase();
  assert(FULL_SHA.test(sha), 'release SHA is invalid');
  return sha;
}

export function verifyForwardProductionAcceptance({
  humanApproval,
  promotionTransition,
  livePostconditions,
  releaseSha,
  generatedAt = new Date().toISOString(),
}) {
  const targetSha = normalizeSha(releaseSha);

  assert(humanApproval?.schema === 'risck-comply.supabase-forward-human-approval-proof.v1', 'human approval proof schema is invalid');
  assert(humanApproval?.status === 'Complete' && humanApproval?.outcome === 'passed', 'human approval proof is not Complete/passed');
  assert(humanApproval?.targetSha === targetSha, 'human approval proof target SHA mismatch');
  assert(DIGEST.test(String(humanApproval?.selectionDigest ?? '')), 'human approval proof selection digest is invalid');
  assert(humanApproval?.checks?.acceptedHumanDecisionGate === true, 'human Decision Gate was not accepted');
  assert(humanApproval?.checks?.everySelectedMigrationPendingDeployment === true, 'human decision coverage is incomplete');
  assert(humanApproval?.checks?.exactSelectedBytesCovered === true, 'human decision byte coverage is incomplete');
  assert(humanApproval?.checks?.productionWriteAuthorizedByDecisionGate === false, 'human Decision Gate must remain non-authorizing');
  assert(Number.isInteger(humanApproval?.selectedMigrationCount) && humanApproval.selectedMigrationCount > 0, 'human approval selected migration count is invalid');

  assert(promotionTransition?.schema === 'risck-comply.supabase-forward-reconciliation-promotion.v1', 'promotion transition schema is invalid');
  assert(promotionTransition?.status === 'Complete' && promotionTransition?.outcome === 'passed', 'promotion transition is not Complete/passed');
  assert(promotionTransition?.targetSha === targetSha, 'promotion transition target SHA mismatch');
  assert(promotionTransition?.selectionDigest === humanApproval.selectionDigest, 'promotion selection digest does not match human approval');
  assert(promotionTransition?.selectedMigrationCount === humanApproval.selectedMigrationCount, 'promotion migration count does not match human approval');
  assert(promotionTransition?.checks?.remoteAfterEqualsBeforePlusSelected === true, 'remote ledger transition is incomplete');
  assert(promotionTransition?.checks?.appliedSetEqualsSelectedSet === true, 'applied set does not equal selected set');
  assert(promotionTransition?.checks?.unauthorizedMigrationApplied === false, 'unauthorized migration was applied');
  assert(promotionTransition?.checks?.migrationHistoryRepairPerformed === false, 'migration history repair was performed');
  assert(promotionTransition?.checks?.unrestrictedDbPushPerformed === false, 'unrestricted db push was performed');

  assert(livePostconditions?.status === 'PASS', 'live postconditions did not pass');
  assert(livePostconditions?.readOnly === true, 'live postcondition proof must be read-only');
  assert(livePostconditions?.postconditions === 'forward_reconciliation_postconditions_passed', 'live postcondition identity is invalid');
  assert(livePostconditions?.targetSha === targetSha, 'live postconditions target SHA mismatch');
  assert(livePostconditions?.selectionDigest === humanApproval.selectionDigest, 'live postconditions selection digest mismatch');

  return {
    schema: 'risck-comply.supabase-forward-production-acceptance.v1',
    evidenceItem: 'supabase-forward-production-acceptance',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    targetSha,
    selectionDigest: humanApproval.selectionDigest,
    selectedMigrationCount: humanApproval.selectedMigrationCount,
    decisionRunId: String(humanApproval.decisionRunId),
    decisionSubjectSha: humanApproval.decisionSubjectSha,
    checks: {
      humanDecisionGateAccepted: true,
      exactHumanReviewedBytesPromoted: true,
      remoteLedgerTransitionExact: true,
      unauthorizedMigrationApplied: false,
      migrationHistoryRepairPerformed: false,
      unrestrictedDbPushPerformed: false,
      liveSchemaSecurityPostconditionsPassed: true,
      livePostconditionProofReadOnly: true,
      exactShaBound: true,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      rowDataStored: false,
      humanNamesStored: false,
      approvalReferenceStored: false,
    },
    truthBoundary: 'Complete proves the exact human-reviewed selected bytes were the exact bytes added to the production migration ledger and that the canonical read-only live schema/security postconditions passed for the same release SHA and selection digest. It does not claim historical backlog reconciliation, provider recovery completion, or tenant A/B runtime evidence beyond the postconditions explicitly executed.',
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function main(argv) {
  const [humanPath, promotionPath, postconditionsPath, outputPath, releaseSha] = argv;
  assert(humanPath && promotionPath && postconditionsPath && outputPath && releaseSha, 'usage: verify-forward-production-acceptance.mjs <human-approval.json> <promotion-transition.json> <live-postconditions.json> <output.json> <release-sha>');
  const evidence = verifyForwardProductionAcceptance({
    humanApproval: await readJson(humanPath),
    promotionTransition: await readJson(promotionPath),
    livePostconditions: await readJson(postconditionsPath),
    releaseSha,
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
