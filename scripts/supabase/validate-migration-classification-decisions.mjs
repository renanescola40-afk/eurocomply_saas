#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  approvalDigestFor,
  CLASSIFICATIONS,
  DECISIONS_SCHEMA,
  decisionDigestFor,
  RESULT_SCHEMA,
  sha256,
  validateInventory,
  writeDecisionArtifacts,
} from './validate-migration-reconciliation-decisions.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/i;
const SHA256 = /^(?:sha256:)?[a-f0-9]{64}$/i;

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const normalizedDigest = (value) => String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
const validTimestamp = (value) => nonEmpty(value) && !Number.isNaN(new Date(value).getTime());
const keyFor = (filename, digest) => `${filename}:${normalizedDigest(digest)}`;

function validateClassification(decision, prefix, failures, blockers) {
  switch (decision.classification) {
    case 'ALREADY_PRESENT_IN_SCHEMA':
      if (!nonEmpty(decision.schemaEvidenceReference)) failures.push(`${prefix}.schema_evidence_required`);
      break;
    case 'PENDING_DEPLOYMENT':
      if (!nonEmpty(decision.schemaEvidenceReference)) failures.push(`${prefix}.pending_schema_evidence_required`);
      if (!Number.isInteger(decision.deployOrderDecision) || decision.deployOrderDecision < 1) {
        failures.push(`${prefix}.positive_deploy_order_required`);
      }
      if (!nonEmpty(decision.rollbackReference)) failures.push(`${prefix}.rollback_reference_required`);
      break;
    case 'SUPERSEDED':
      if (!SHA256.test(String(decision.replacementMigrationDigest ?? ''))) failures.push(`${prefix}.replacement_digest_required`);
      if (!nonEmpty(decision.schemaEvidenceReference)) failures.push(`${prefix}.supersession_evidence_required`);
      break;
    case 'ARCHIVE_LEGACY':
      if (!nonEmpty(decision.archivalMappingReference)) failures.push(`${prefix}.archival_mapping_required`);
      if (!nonEmpty(decision.schemaEvidenceReference)) failures.push(`${prefix}.legacy_schema_evidence_required`);
      break;
    case 'REQUIRES_SPLIT_REVIEW':
      if (!nonEmpty(decision.splitReviewReference)) failures.push(`${prefix}.split_review_reference_required`);
      blockers.push(`${prefix}.split_review_unresolved`);
      break;
    default:
      failures.push(`${prefix}.classification_invalid`);
  }
}

export function evaluateMigrationClassificationDecisions({
  inventory,
  inventoryBytes,
  decisionsDocument,
  expectedReleaseSha,
  now = new Date(),
}) {
  const failures = validateInventory(inventory);
  const blockers = [];
  const inventorySha256 = sha256(inventoryBytes);
  const releaseSha = String(decisionsDocument?.releaseSha ?? '').toLowerCase();

  if (decisionsDocument?.schema !== DECISIONS_SCHEMA) failures.push('decisions_schema_unsupported');
  if (!FULL_SHA.test(releaseSha)) failures.push('release_sha_invalid');
  if (expectedReleaseSha && releaseSha !== String(expectedReleaseSha).toLowerCase()) failures.push('release_sha_mismatch');
  if (normalizedDigest(decisionsDocument?.inventorySha256) !== inventorySha256) failures.push('inventory_digest_mismatch');
  if (!Array.isArray(decisionsDocument?.decisions)) failures.push('decisions_array_missing');

  const inventoryItems = inventory?.items ?? [];
  const decisions = decisionsDocument?.decisions ?? [];
  const inventoryByKey = new Map(inventoryItems.map((item) => [keyFor(item.filename, item.sha256), item]));
  const decisionsByKey = new Map();
  const classificationCounts = Object.fromEntries(CLASSIFICATIONS.map((value) => [value, 0]));
  const deployOrders = new Map();
  const reviewers = new Set();

  for (const [index, decision] of decisions.entries()) {
    const prefix = `decisions[${index}]`;
    const key = keyFor(decision?.filename ?? '', decision?.sha256 ?? '');
    if (decisionsByKey.has(key)) failures.push(`${prefix}.duplicate_decision`);
    decisionsByKey.set(key, decision);
    if (!inventoryByKey.has(key)) failures.push(`${prefix}.not_in_inventory`);
    if (!nonEmpty(decision?.rationale)) failures.push(`${prefix}.rationale_required`);
    if (!nonEmpty(decision?.reviewer)) failures.push(`${prefix}.reviewer_required`);
    if (!nonEmpty(decision?.reviewerRole)) failures.push(`${prefix}.reviewer_role_required`);
    if (!validTimestamp(decision?.reviewedAt)) failures.push(`${prefix}.reviewed_at_invalid`);
    if (validTimestamp(decision?.reviewedAt) && new Date(decision.reviewedAt) > now) failures.push(`${prefix}.reviewed_at_in_future`);
    if (nonEmpty(decision?.reviewer)) reviewers.add(decision.reviewer.trim().toLowerCase());

    validateClassification(decision ?? {}, prefix, failures, blockers);
    if (CLASSIFICATIONS.includes(decision?.classification)) classificationCounts[decision.classification] += 1;

    if (decision?.classification === 'PENDING_DEPLOYMENT' && Number.isInteger(decision.deployOrderDecision)) {
      const existing = deployOrders.get(decision.deployOrderDecision);
      if (existing) failures.push(`${prefix}.duplicate_deploy_order_with_${existing}`);
      else deployOrders.set(decision.deployOrderDecision, decision.filename);
    }

    const expectedDigest = decisionDigestFor({ releaseSha, inventorySha256, decision });
    if (normalizedDigest(decision?.decisionDigest) !== expectedDigest) failures.push(`${prefix}.decision_digest_mismatch`);
  }

  for (const item of inventoryItems) {
    if (!decisionsByKey.has(keyFor(item.filename, item.sha256))) failures.push(`missing_decision:${item.filename}:${item.sha256}`);
  }
  if (decisions.length !== inventoryItems.length) failures.push('decision_count_mismatch');

  const approver = decisionsDocument?.independentApprover;
  if (!approver || typeof approver !== 'object' || Array.isArray(approver)) {
    failures.push('independent_approver_required');
  } else {
    if (!nonEmpty(approver.name)) failures.push('independent_approver_name_required');
    if (!nonEmpty(approver.role)) failures.push('independent_approver_role_required');
    if (!validTimestamp(approver.approvedAt)) failures.push('independent_approver_timestamp_invalid');
    if (validTimestamp(approver.approvedAt) && new Date(approver.approvedAt) > now) failures.push('independent_approver_timestamp_in_future');
    if (!nonEmpty(approver.approvalReference)) failures.push('independent_approval_reference_required');
    if (nonEmpty(approver.name) && reviewers.has(approver.name.trim().toLowerCase())) {
      failures.push('independent_approver_must_not_be_item_reviewer');
    }
  }

  const expectedApprovalDigest = approvalDigestFor({
    releaseSha,
    inventorySha256,
    decisions,
    independentApprover: approver,
  });
  if (normalizedDigest(decisionsDocument?.approvalDigest) !== expectedApprovalDigest) failures.push('approval_digest_mismatch');

  if (decisionsDocument?.status !== 'REVIEWED') blockers.push('document_status_not_reviewed');
  if (classificationCounts.REQUIRES_SPLIT_REVIEW > 0) blockers.push('split_review_items_remain');

  const accepted = failures.length === 0 && blockers.length === 0;
  const pendingDeployment = decisions
    .filter((decision) => decision.classification === 'PENDING_DEPLOYMENT')
    .sort((left, right) => left.deployOrderDecision - right.deployOrderDecision);

  return {
    schema: RESULT_SCHEMA,
    generatedAt: now.toISOString(),
    releaseSha,
    inventorySha256,
    decisionStatus: accepted ? 'RECONCILIATION_ACCEPTED_FOR_STAGING' : 'HUMAN_REVIEW_REQUIRED',
    deploymentAuthorization: 'NOT_AUTHORIZED',
    dryRunAuthorization: 'NOT_AUTHORIZED_BY_THIS_GATE',
    accepted,
    stagingRequired: pendingDeployment.length > 0,
    counts: {
      inventoryItems: inventoryItems.length,
      submittedDecisions: decisions.length,
      acceptedDecisions: accepted ? decisions.length : 0,
      ...classificationCounts,
    },
    failures,
    blockers: [...new Set(blockers)],
    plans: {
      migrationHistoryRepairCandidates: decisions.filter((decision) => decision.classification === 'ALREADY_PRESENT_IN_SCHEMA'),
      pendingDeployment,
      superseded: decisions.filter((decision) => decision.classification === 'SUPERSEDED'),
      archiveLegacy: decisions.filter((decision) => decision.classification === 'ARCHIVE_LEGACY'),
      splitReview: decisions.filter((decision) => decision.classification === 'REQUIRES_SPLIT_REVIEW'),
    },
    safety: {
      sqlExecuted: false,
      databaseModified: false,
      migrationHistoryModified: false,
      productionWriteAuthorized: false,
      stagingEvidenceRequiredBeforeProduction: pendingDeployment.length > 0,
      note: 'This accepts human classification for staging preparation only. Pending migrations are not production-ready until protected staging rehearsal passes.',
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((argument) => !argument.startsWith('--'));
  const inventoryPath = positional[0];
  const decisionsPath = positional[1];
  const outputDir = positional[2] ?? 'artifacts/supabase-migration-reconciliation-decisions';
  const expectedSha = args.find((argument) => argument.startsWith('--expected-sha='))?.slice('--expected-sha='.length);
  if (!inventoryPath || !decisionsPath) throw new Error('usage: inventory.json decisions.json [output-dir] --expected-sha=<subject-sha>');

  const inventoryBytes = await readFile(inventoryPath);
  const decisionsBytes = await readFile(decisionsPath);
  const result = evaluateMigrationClassificationDecisions({
    inventory: JSON.parse(inventoryBytes),
    inventoryBytes,
    decisionsDocument: JSON.parse(decisionsBytes),
    expectedReleaseSha: expectedSha,
  });
  await writeDecisionArtifacts(outputDir, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.accepted) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
