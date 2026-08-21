#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MANIFEST_SCHEMA = 'risck-comply.supabase-forward-reconciliation-manifest.v1';
const DECISION_RESULT_SCHEMA = 'risck-comply.supabase-migration-reconciliation-decision-result.v1';
const PENDING_PLAN_SCHEMA = 'risck-comply.supabase-migration-pending-deployment-plan.v1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeDigest(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

function keyFor(filename, digest) {
  return `${String(filename ?? '')}:${normalizeDigest(digest)}`;
}

export function verifyForwardHumanApproval({
  manifest,
  decisionResult,
  pendingDeploymentPlan,
  targetSha,
  decisionSubjectSha,
  decisionRunId,
  evidenceCommitSha,
  generatedAt = new Date().toISOString(),
}) {
  const normalizedTarget = String(targetSha ?? '').trim().toLowerCase();
  const normalizedSubject = String(decisionSubjectSha ?? '').trim().toLowerCase();
  const normalizedEvidence = String(evidenceCommitSha ?? '').trim().toLowerCase();
  assert(FULL_SHA.test(normalizedTarget), 'target SHA is invalid');
  assert(FULL_SHA.test(normalizedSubject), 'decision subject SHA is invalid');
  assert(FULL_SHA.test(normalizedEvidence), 'decision evidence commit SHA is invalid');
  assert(/^\d+$/.test(String(decisionRunId ?? '')), 'decision run ID is invalid');
  assert(normalizedSubject === normalizedTarget, 'decision subject SHA must equal target SHA; byte equivalence cannot transfer human approval');
  assert(normalizedEvidence === normalizedTarget, 'decision evidence commit SHA must equal target SHA');

  assert(manifest?.schema === MANIFEST_SCHEMA, 'forward reconciliation manifest schema is invalid');
  assert(manifest?.targetSha === normalizedTarget, 'forward reconciliation manifest target SHA mismatch');
  assert(Array.isArray(manifest?.migrations) && manifest.migrations.length > 0, 'forward reconciliation manifest has no migrations');
  assert(typeof manifest?.selectionDigest === 'string' && /^sha256:[a-f0-9]{64}$/.test(manifest.selectionDigest), 'forward reconciliation selection digest is invalid');

  assert(decisionResult?.schema === DECISION_RESULT_SCHEMA, 'decision result schema is invalid');
  assert(decisionResult?.accepted === true, 'human migration decisions are not accepted');
  assert(decisionResult?.decisionStatus === 'RECONCILIATION_ACCEPTED_FOR_STAGING', 'human migration decision status is not accepted for staging');
  assert(decisionResult?.deploymentAuthorization === 'NOT_AUTHORIZED', 'decision gate must not itself authorize deployment');
  assert(String(decisionResult?.releaseSha ?? '').toLowerCase() === normalizedSubject, 'decision result subject SHA mismatch');
  assert(Array.isArray(decisionResult?.plans?.pendingDeployment), 'decision result pending deployment plan is missing');

  assert(pendingDeploymentPlan?.schema === PENDING_PLAN_SCHEMA, 'pending deployment artifact schema is invalid');
  assert(String(pendingDeploymentPlan?.releaseSha ?? '').toLowerCase() === normalizedSubject, 'pending deployment artifact subject SHA mismatch');
  assert(pendingDeploymentPlan?.decisionStatus === 'RECONCILIATION_ACCEPTED_FOR_STAGING', 'pending deployment artifact decision status is invalid');
  assert(pendingDeploymentPlan?.productionWriteAuthorized === false, 'pending deployment artifact must not authorize production');
  assert(Array.isArray(pendingDeploymentPlan?.items), 'pending deployment artifact items are missing');

  const pendingFromResult = new Map();
  for (const item of decisionResult.plans.pendingDeployment) {
    const key = keyFor(item?.filename, item?.sha256);
    assert(item?.classification === 'PENDING_DEPLOYMENT', `decision item is not PENDING_DEPLOYMENT: ${item?.filename ?? 'unknown'}`);
    assert(SHA256.test(normalizeDigest(item?.sha256)), `decision item digest is invalid: ${item?.filename ?? 'unknown'}`);
    assert(!pendingFromResult.has(key), `duplicate pending decision item: ${item?.filename ?? 'unknown'}`);
    pendingFromResult.set(key, item);
  }

  const pendingArtifact = new Map();
  for (const item of pendingDeploymentPlan.items) {
    const key = keyFor(item?.filename, item?.sha256);
    assert(item?.classification === 'PENDING_DEPLOYMENT', `pending artifact item is not PENDING_DEPLOYMENT: ${item?.filename ?? 'unknown'}`);
    assert(SHA256.test(normalizeDigest(item?.sha256)), `pending artifact item digest is invalid: ${item?.filename ?? 'unknown'}`);
    assert(!pendingArtifact.has(key), `duplicate pending artifact item: ${item?.filename ?? 'unknown'}`);
    pendingArtifact.set(key, item);
  }

  const approved = [];
  for (const migration of manifest.migrations) {
    const digest = normalizeDigest(migration?.sha256);
    assert(SHA256.test(digest), `selected migration digest is invalid: ${migration?.filename ?? 'unknown'}`);
    const key = keyFor(migration.filename, digest);
    const resultItem = pendingFromResult.get(key);
    const artifactItem = pendingArtifact.get(key);
    assert(resultItem, `selected migration lacks accepted PENDING_DEPLOYMENT human decision: ${migration.filename}`);
    assert(artifactItem, `selected migration is absent from accepted pending deployment artifact: ${migration.filename}`);
    assert(Number.isInteger(resultItem.deployOrderDecision) && resultItem.deployOrderDecision > 0, `selected migration has invalid reviewed deploy order: ${migration.filename}`);
    assert(resultItem.schemaEvidenceReference, `selected migration lacks human schema evidence reference: ${migration.filename}`);
    assert(resultItem.rollbackReference, `selected migration lacks human rollback reference: ${migration.filename}`);
    assert(resultItem.reviewer && resultItem.reviewerRole && resultItem.reviewedAt, `selected migration lacks reviewer provenance: ${migration.filename}`);
    approved.push({
      version: migration.version,
      filename: migration.filename,
      sha256: digest,
      deployOrderDecision: resultItem.deployOrderDecision,
    });
  }

  assert(approved.length === manifest.migrations.length, 'not every selected migration has human approval coverage');

  return {
    schema: 'risck-comply.supabase-forward-human-approval-proof.v1',
    evidenceItem: 'supabase-forward-human-approval-proof',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    targetSha: normalizedTarget,
    decisionSubjectSha: normalizedSubject,
    decisionEvidenceCommitSha: normalizedEvidence,
    decisionRunId: String(decisionRunId),
    selectionDigest: manifest.selectionDigest,
    selectedMigrationCount: approved.length,
    checks: {
      acceptedHumanDecisionGate: true,
      decisionSubjectEqualsTargetSha: true,
      everySelectedMigrationPendingDeployment: true,
      exactSelectedBytesCovered: true,
      reviewerProvenancePresent: true,
      schemaEvidenceReferencesPresent: true,
      rollbackReferencesPresent: true,
      productionWriteAuthorizedByDecisionGate: false,
    },
    migrations: approved,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      rowDataStored: false,
      humanNamesStored: false,
      approvalReferenceStored: false,
    },
    truthBoundary: 'This proof establishes that every selected forward migration byte is covered by an accepted human PENDING_DEPLOYMENT classification bound to the exact production target SHA. Byte equivalence never transfers human approval. It does not authorize production by itself, repair migration history, or permit migrations outside the selected manifest.',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const [manifestPath, decisionResultPath, pendingPath, outputPath] = positional;
  const targetSha = args.find((arg) => arg.startsWith('--target-sha='))?.slice('--target-sha='.length);
  const decisionSubjectSha = args.find((arg) => arg.startsWith('--decision-subject-sha='))?.slice('--decision-subject-sha='.length);
  const decisionRunId = args.find((arg) => arg.startsWith('--decision-run-id='))?.slice('--decision-run-id='.length);
  const evidenceCommitSha = args.find((arg) => arg.startsWith('--evidence-commit-sha='))?.slice('--evidence-commit-sha='.length);
  if (!manifestPath || !decisionResultPath || !pendingPath || !outputPath) {
    throw new Error('usage: manifest.json decision-result.json pending-deployment-plan.json output.json --target-sha=<sha> --decision-subject-sha=<sha> --decision-run-id=<id> --evidence-commit-sha=<sha>');
  }
  const [manifest, decisionResult, pendingDeploymentPlan] = await Promise.all([
    readFile(manifestPath, 'utf8').then(JSON.parse),
    readFile(decisionResultPath, 'utf8').then(JSON.parse),
    readFile(pendingPath, 'utf8').then(JSON.parse),
  ]);
  const proof = verifyForwardHumanApproval({ manifest, decisionResult, pendingDeploymentPlan, targetSha, decisionSubjectSha, decisionRunId, evidenceCommitSha });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: proof.status, outcome: proof.outcome, selectedMigrationCount: proof.selectedMigrationCount })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
