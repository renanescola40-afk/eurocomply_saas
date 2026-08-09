#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const INVENTORY_SCHEMA = 'risck-comply.supabase-migration-reconciliation-inventory.v1';
export const DECISIONS_SCHEMA = 'risck-comply.supabase-migration-reconciliation-decisions.v1';
export const RESULT_SCHEMA = 'risck-comply.supabase-migration-reconciliation-decision-result.v1';
export const CLASSIFICATIONS = Object.freeze([
  'ALREADY_PRESENT_IN_SCHEMA',
  'PENDING_DEPLOYMENT',
  'SUPERSEDED',
  'ARCHIVE_LEGACY',
  'REQUIRES_SPLIT_REVIEW',
]);

const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;
const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/i;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizedDigest(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validTimestamp(value) {
  return nonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

function decisionKey(filename, digest) {
  return `${filename}:${normalizedDigest(digest)}`;
}

export function validateInventory(inventory) {
  const failures = [];
  if (inventory?.schema !== INVENTORY_SCHEMA) failures.push('inventory_schema_unsupported');
  if (!Array.isArray(inventory?.items)) failures.push('inventory_items_missing');
  if (!Array.isArray(inventory?.allowedClassifications)) failures.push('inventory_classifications_missing');

  const seen = new Set();
  for (const [index, item] of (inventory?.items ?? []).entries()) {
    const prefix = `inventory.items[${index}]`;
    if (!nonEmptyString(item?.filename)) failures.push(`${prefix}.filename_required`);
    if (!SHA256_PATTERN.test(String(item?.sha256 ?? ''))) failures.push(`${prefix}.sha256_invalid`);
    const key = decisionKey(item?.filename ?? '', item?.sha256 ?? '');
    if (seen.has(key)) failures.push(`${prefix}.duplicate_item`);
    seen.add(key);
  }
  return failures;
}

function decisionDigestPayload({ releaseSha, inventorySha256, decision }) {
  return {
    schema: 'risck-comply.supabase-migration-reconciliation-decision-digest.v1',
    releaseSha,
    inventorySha256,
    filename: decision.filename,
    migrationSha256: normalizedDigest(decision.sha256),
    classification: decision.classification,
    rationale: decision.rationale,
    evidence: {
      schemaEvidenceReference: decision.schemaEvidenceReference ?? null,
      replacementMigrationDigest: decision.replacementMigrationDigest ?? null,
      stagedExecutionEvidenceReference: decision.stagedExecutionEvidenceReference ?? null,
      deployOrderDecision: decision.deployOrderDecision ?? null,
      rollbackReference: decision.rollbackReference ?? null,
      archivalMappingReference: decision.archivalMappingReference ?? null,
      splitReviewReference: decision.splitReviewReference ?? null,
    },
    reviewer: decision.reviewer,
    reviewerRole: decision.reviewerRole,
    reviewedAt: decision.reviewedAt,
  };
}

export function decisionDigestFor(args) {
  return sha256(stableStringify(decisionDigestPayload(args)));
}

function approvalDigestPayload({ releaseSha, inventorySha256, decisions, independentApprover }) {
  return {
    schema: 'risck-comply.supabase-migration-reconciliation-approval-digest.v1',
    releaseSha,
    inventorySha256,
    decisionDigests: decisions
      .map((decision) => normalizedDigest(decision.decisionDigest))
      .sort(),
    independentApprover: {
      name: independentApprover?.name ?? null,
      role: independentApprover?.role ?? null,
      approvedAt: independentApprover?.approvedAt ?? null,
      approvalReference: independentApprover?.approvalReference ?? null,
    },
  };
}

export function approvalDigestFor(args) {
  return sha256(stableStringify(approvalDigestPayload(args)));
}

function validateClassificationEvidence(decision, prefix, failures, blockers) {
  switch (decision.classification) {
    case 'ALREADY_PRESENT_IN_SCHEMA':
      if (!nonEmptyString(decision.schemaEvidenceReference)) {
        failures.push(`${prefix}.schema_evidence_required`);
      }
      break;
    case 'PENDING_DEPLOYMENT':
      if (!nonEmptyString(decision.schemaEvidenceReference)) {
        failures.push(`${prefix}.pending_schema_evidence_required`);
      }
      if (!Number.isInteger(decision.deployOrderDecision) || decision.deployOrderDecision < 1) {
        failures.push(`${prefix}.positive_deploy_order_required`);
      }
      if (!nonEmptyString(decision.rollbackReference)) {
        failures.push(`${prefix}.rollback_reference_required`);
      }
      break;
    case 'SUPERSEDED':
      if (!SHA256_PATTERN.test(String(decision.replacementMigrationDigest ?? ''))) {
        failures.push(`${prefix}.replacement_digest_required`);
      }
      if (!nonEmptyString(decision.schemaEvidenceReference)) {
        failures.push(`${prefix}.supersession_evidence_required`);
      }
      break;
    case 'ARCHIVE_LEGACY':
      if (!nonEmptyString(decision.archivalMappingReference)) {
        failures.push(`${prefix}.archival_mapping_required`);
      }
      if (!nonEmptyString(decision.schemaEvidenceReference)) {
        failures.push(`${prefix}.legacy_schema_evidence_required`);
      }
      break;
    case 'REQUIRES_SPLIT_REVIEW':
      if (!nonEmptyString(decision.splitReviewReference)) {
        failures.push(`${prefix}.split_review_reference_required`);
      }
      blockers.push(`${prefix}.split_review_unresolved`);
      break;
    default:
      failures.push(`${prefix}.classification_invalid`);
  }
}

export function evaluateMigrationReconciliationDecisions({
  inventory,
  inventoryBytes,
  decisionsDocument,
  expectedReleaseSha,
  now = new Date(),
}) {
  const failures = validateInventory(inventory);
  const blockers = [];
  const expectedInventorySha256 = sha256(inventoryBytes);
  const releaseSha = String(decisionsDocument?.releaseSha ?? '').toLowerCase();

  if (decisionsDocument?.schema !== DECISIONS_SCHEMA) failures.push('decisions_schema_unsupported');
  if (!FULL_SHA_PATTERN.test(releaseSha)) failures.push('release_sha_invalid');
  if (expectedReleaseSha && releaseSha !== String(expectedReleaseSha).toLowerCase()) {
    failures.push('release_sha_mismatch');
  }
  if (normalizedDigest(decisionsDocument?.inventorySha256) !== expectedInventorySha256) {
    failures.push('inventory_digest_mismatch');
  }
  if (!Array.isArray(decisionsDocument?.decisions)) failures.push('decisions_array_missing');

  const inventoryItems = inventory?.items ?? [];
  const decisions = decisionsDocument?.decisions ?? [];
  const inventoryByKey = new Map(
    inventoryItems.map((item) => [decisionKey(item.filename, item.sha256), item]),
  );
  const decisionsByKey = new Map();
  const classificationCounts = Object.fromEntries(CLASSIFICATIONS.map((value) => [value, 0]));
  const deployOrders = new Map();
  const reviewerNames = new Set();

  for (const [index, decision] of decisions.entries()) {
    const prefix = `decisions[${index}]`;
    const key = decisionKey(decision?.filename ?? '', decision?.sha256 ?? '');
    if (decisionsByKey.has(key)) failures.push(`${prefix}.duplicate_decision`);
    decisionsByKey.set(key, decision);

    const inventoryItem = inventoryByKey.get(key);
    if (!inventoryItem) failures.push(`${prefix}.not_in_inventory`);
    if (!nonEmptyString(decision?.rationale)) failures.push(`${prefix}.rationale_required`);
    if (!nonEmptyString(decision?.reviewer)) failures.push(`${prefix}.reviewer_required`);
    if (!nonEmptyString(decision?.reviewerRole)) failures.push(`${prefix}.reviewer_role_required`);
    if (!validTimestamp(decision?.reviewedAt)) failures.push(`${prefix}.reviewed_at_invalid`);
    if (validTimestamp(decision?.reviewedAt) && new Date(decision.reviewedAt) > now) {
      failures.push(`${prefix}.reviewed_at_in_future`);
    }

    if (nonEmptyString(decision?.reviewer)) reviewerNames.add(decision.reviewer.trim().toLowerCase());
    validateClassificationEvidence(decision ?? {}, prefix, failures, blockers);

    if (CLASSIFICATIONS.includes(decision?.classification)) {
      classificationCounts[decision.classification] += 1;
    }

    if (decision?.classification === 'PENDING_DEPLOYMENT' && Number.isInteger(decision.deployOrderDecision)) {
      const existing = deployOrders.get(decision.deployOrderDecision);
      if (existing) failures.push(`${prefix}.duplicate_deploy_order_with_${existing}`);
      else deployOrders.set(decision.deployOrderDecision, decision.filename);
    }

    const expectedDecisionDigest = decisionDigestFor({
      releaseSha,
      inventorySha256: expectedInventorySha256,
      decision,
    });
    if (normalizedDigest(decision?.decisionDigest) !== expectedDecisionDigest) {
      failures.push(`${prefix}.decision_digest_mismatch`);
    }
  }

  for (const item of inventoryItems) {
    if (!decisionsByKey.has(decisionKey(item.filename, item.sha256))) {
      failures.push(`missing_decision:${item.filename}:${item.sha256}`);
    }
  }
  if (decisions.length !== inventoryItems.length) failures.push('decision_count_mismatch');

  const approver = decisionsDocument?.independentApprover;
  if (!approver || typeof approver !== 'object' || Array.isArray(approver)) {
    failures.push('independent_approver_required');
  } else {
    if (!nonEmptyString(approver.name)) failures.push('independent_approver_name_required');
    if (!nonEmptyString(approver.role)) failures.push('independent_approver_role_required');
    if (!validTimestamp(approver.approvedAt)) failures.push('independent_approver_timestamp_invalid');
    if (!nonEmptyString(approver.approvalReference)) failures.push('independent_approval_reference_required');
    if (nonEmptyString(approver.name) && reviewerNames.has(approver.name.trim().toLowerCase())) {
      failures.push('independent_approver_must_not_be_item_reviewer');
    }
  }

  const expectedApprovalDigest = approvalDigestFor({
    releaseSha,
    inventorySha256: expectedInventorySha256,
    decisions,
    independentApprover: approver,
  });
  if (normalizedDigest(decisionsDocument?.approvalDigest) !== expectedApprovalDigest) {
    failures.push('approval_digest_mismatch');
  }

  if (decisionsDocument?.status !== 'REVIEWED') blockers.push('document_status_not_reviewed');
  if (classificationCounts.REQUIRES_SPLIT_REVIEW > 0) blockers.push('split_review_items_remain');

  const accepted = failures.length === 0 && blockers.length === 0;
  const sortedPending = decisions
    .filter((decision) => decision.classification === 'PENDING_DEPLOYMENT')
    .sort((left, right) => left.deployOrderDecision - right.deployOrderDecision);
  const decisionStatus = accepted
    ? sortedPending.length > 0
      ? 'RECONCILIATION_ACCEPTED_FOR_STAGING'
      : 'RECONCILIATION_ACCEPTED'
    : 'HUMAN_REVIEW_REQUIRED';

  return {
    schema: RESULT_SCHEMA,
    generatedAt: now.toISOString(),
    releaseSha,
    inventorySha256: expectedInventorySha256,
    decisionStatus,
    deploymentAuthorization: 'NOT_AUTHORIZED',
    dryRunAuthorization: 'NOT_AUTHORIZED_BY_THIS_GATE',
    accepted,
    counts: {
      inventoryItems: inventoryItems.length,
      submittedDecisions: decisions.length,
      acceptedDecisions: accepted ? decisions.length : 0,
      ...classificationCounts,
    },
    failures,
    blockers: [...new Set(blockers)],
    plans: {
      migrationHistoryRepairCandidates: decisions.filter((decision) => (
        decision.classification === 'ALREADY_PRESENT_IN_SCHEMA'
      )),
      pendingDeployment: sortedPending,
      superseded: decisions.filter((decision) => decision.classification === 'SUPERSEDED'),
      archiveLegacy: decisions.filter((decision) => decision.classification === 'ARCHIVE_LEGACY'),
      splitReview: decisions.filter((decision) => decision.classification === 'REQUIRES_SPLIT_REVIEW'),
    },
    safety: {
      databaseModified: false,
      migrationHistoryModified: false,
      sqlExecuted: false,
      productionWriteAuthorized: false,
      note: 'Accepted decisions authorize repository planning and, when pending migrations exist, progression to protected staging rehearsal only. Staging evidence remains mandatory before any production execution.',
    },
  };
}

function planDocument(result, planName, items) {
  return {
    schema: `risck-comply.supabase-migration-${planName}.v1`,
    generatedAt: result.generatedAt,
    releaseSha: result.releaseSha,
    inventorySha256: result.inventorySha256,
    decisionStatus: result.decisionStatus,
    productionWriteAuthorized: false,
    itemCount: items.length,
    items,
  };
}

export async function writeDecisionArtifacts(outputDir, result) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'decision-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(
    path.join(outputDir, 'migration-history-repair-candidates.json'),
    `${JSON.stringify(planDocument(result, 'history-repair-candidates', result.plans.migrationHistoryRepairCandidates), null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, 'pending-deployment-plan.json'),
    `${JSON.stringify(planDocument(result, 'pending-deployment-plan', result.plans.pendingDeployment), null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, 'superseded-plan.json'),
    `${JSON.stringify(planDocument(result, 'superseded-plan', result.plans.superseded), null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, 'archive-legacy-plan.json'),
    `${JSON.stringify(planDocument(result, 'archive-legacy-plan', result.plans.archiveLegacy), null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, 'split-review-plan.json'),
    `${JSON.stringify(planDocument(result, 'split-review-plan', result.plans.splitReview), null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, 'summary.md'),
    [
      '# Supabase migration reconciliation decision gate',
      '',
      `- Status: \`${result.decisionStatus}\``,
      `- Release SHA: \`${result.releaseSha || 'missing'}\``,
      `- Inventory SHA-256: \`${result.inventorySha256}\``,
      `- Inventory items: ${result.counts.inventoryItems}`,
      `- Submitted decisions: ${result.counts.submittedDecisions}`,
      `- Failures: ${result.failures.length}`,
      `- Blockers: ${result.blockers.length}`,
      '',
      'This gate does not execute SQL, repair migration history, authorize a dry-run, or authorize a production write.',
      '',
    ].join('\n'),
  );
}

async function runCli() {
  const args = process.argv.slice(2);
  const allowBlocked = args.includes('--allow-blocked');
  const positional = args.filter((argument) => !argument.startsWith('--'));
  const inventoryPath = positional[0]
    ?? 'artifacts/supabase-production-migration-dry-run/drift/migration-reconciliation-inventory.json';
  const decisionsPath = positional[1]
    ?? 'docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json';
  const outputDir = positional[2]
    ?? 'artifacts/supabase-migration-reconciliation-decisions';
  const expectedShaArgument = args.find((argument) => argument.startsWith('--expected-sha='));
  const expectedReleaseSha = expectedShaArgument?.split('=')[1]
    ?? process.env.TARGET_SHA
    ?? process.env.GITHUB_SHA;

  try {
    const inventoryBytes = await readFile(inventoryPath);
    const inventory = JSON.parse(inventoryBytes.toString('utf8'));
    const decisionsDocument = JSON.parse(await readFile(decisionsPath, 'utf8'));
    const result = evaluateMigrationReconciliationDecisions({
      inventory,
      inventoryBytes,
      decisionsDocument,
      expectedReleaseSha,
    });
    await writeDecisionArtifacts(outputDir, result);
    console.log(JSON.stringify(result, null, 2));
    if (!result.accepted && !allowBlocked) process.exit(2);
  } catch (error) {
    console.error(`Migration reconciliation decision validation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
