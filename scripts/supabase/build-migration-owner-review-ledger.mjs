#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const INVENTORY_SCHEMA = 'risck-comply.supabase-migration-reconciliation-inventory.v1';
const REVIEW_SCHEMA = 'risck-comply.supabase-migration-owner-review-records.v1';
const LEDGER_SCHEMA = 'risck-comply.supabase-migration-owner-review-ledger.v1';
const ALLOWED_CLASSIFICATIONS = new Set([
  'ALREADY_PRESENT_IN_SCHEMA',
  'PENDING_DEPLOYMENT',
  'SUPERSEDED',
  'ARCHIVE_LEGACY',
  'REQUIRES_SPLIT_REVIEW',
]);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const isSha256 = (value) => /^[a-f0-9]{64}$/i.test(String(value ?? ''));
const isGitSha = (value) => /^[a-f0-9]{40}$/i.test(String(value ?? ''));

function stableItemSort(left, right) {
  return [left.version ?? '', left.filename, left.sha256]
    .join(':')
    .localeCompare([right.version ?? '', right.filename, right.sha256].join(':'));
}

function pushUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

export function buildOwnerReviewLedger({
  inventory,
  inventorySha256,
  reviews,
  batchSize = 15,
}) {
  const blockers = [];
  if (inventory?.schema !== INVENTORY_SCHEMA) blockers.push('unsupported inventory schema');
  if (!Array.isArray(inventory?.items)) blockers.push('inventory.items must be an array');
  if (!isSha256(inventorySha256)) blockers.push('inventorySha256 must be a SHA-256 digest');

  if (reviews?.schema !== REVIEW_SCHEMA) blockers.push('unsupported owner review records schema');
  if (!isGitSha(reviews?.subjectSha)) blockers.push('reviews.subjectSha must be a full 40-character Git SHA');
  if (!isSha256(reviews?.inventorySha256)) blockers.push('reviews.inventorySha256 must be a SHA-256 digest');
  if (
    isSha256(inventorySha256)
    && isSha256(reviews?.inventorySha256)
    && reviews.inventorySha256.toLowerCase() !== inventorySha256.toLowerCase()
  ) {
    blockers.push('owner review records inventory digest mismatch');
  }
  if (!Array.isArray(reviews?.records)) blockers.push('reviews.records must be an array');
  if (!Array.isArray(reviews?.unresolvedCredits)) blockers.push('reviews.unresolvedCredits must be an array');
  if (
    reviews?.quarantinedHistoricalCredits !== undefined
    && !Array.isArray(reviews.quarantinedHistoricalCredits)
  ) {
    blockers.push('reviews.quarantinedHistoricalCredits must be an array');
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    blockers.push('batchSize must be an integer between 1 and 100');
  }

  const inventoryItems = Array.isArray(inventory?.items) ? inventory.items : [];
  const inventoryByFilename = new Map();
  for (const [index, item] of inventoryItems.entries()) {
    const prefix = `inventory.items[${index}]`;
    if (!item?.filename) {
      blockers.push(`${prefix}.filename is required`);
      continue;
    }
    if (!isSha256(item?.sha256)) blockers.push(`${prefix}.sha256 must be a SHA-256 digest`);
    if (inventoryByFilename.has(item.filename)) {
      blockers.push(`duplicate inventory filename: ${item.filename}`);
      continue;
    }
    inventoryByFilename.set(item.filename, item);
  }

  const exactReviewedByFilename = new Map();
  const reaffirmations = [];
  const reviewRecords = Array.isArray(reviews?.records) ? reviews.records : [];
  for (const [index, record] of reviewRecords.entries()) {
    const prefix = `reviews.records[${index}]`;
    const source = inventoryByFilename.get(record?.filename);
    if (!record?.filename) {
      blockers.push(`${prefix}.filename is required`);
      continue;
    }
    if (!source) {
      blockers.push(`review record not present in inventory: ${record.filename}`);
      continue;
    }
    if (!isSha256(record?.sha256)) {
      blockers.push(`${prefix}.sha256 must be a SHA-256 digest`);
      continue;
    }
    if (record.sha256.toLowerCase() !== String(source.sha256).toLowerCase()) {
      blockers.push(`review record digest mismatch: ${record.filename}`);
      continue;
    }
    if (!ALLOWED_CLASSIFICATIONS.has(record?.classification)) {
      blockers.push(`unsupported classification for ${record.filename}`);
      continue;
    }
    if (!record?.sourceEvidencePath) blockers.push(`${prefix}.sourceEvidencePath is required`);
    if (!record?.reviewer) blockers.push(`${prefix}.reviewer is required`);
    if (!record?.reviewedAt || Number.isNaN(new Date(record.reviewedAt).getTime())) {
      blockers.push(`${prefix}.reviewedAt must be a valid timestamp`);
    }

    const existing = exactReviewedByFilename.get(record.filename);
    if (!existing) {
      exactReviewedByFilename.set(record.filename, {
        filename: record.filename,
        version: source.version ?? null,
        sha256: source.sha256,
        classification: record.classification,
        sourceEvidencePaths: record.sourceEvidencePath ? [record.sourceEvidencePath] : [],
        reviewer: record.reviewer ?? null,
        reviewerRole: record.reviewerRole ?? null,
        reviewedAt: record.reviewedAt ?? null,
      });
      continue;
    }

    if (
      existing.sha256.toLowerCase() !== record.sha256.toLowerCase()
      || existing.classification !== record.classification
    ) {
      blockers.push(`conflicting owner review records: ${record.filename}`);
      continue;
    }

    if (record.sourceEvidencePath) pushUnique(existing.sourceEvidencePaths, record.sourceEvidencePath);
    reaffirmations.push({
      filename: record.filename,
      classification: record.classification,
      sourceEvidencePath: record.sourceEvidencePath ?? null,
    });
  }

  let unresolvedCreditCount = 0;
  const unresolvedCredits = Array.isArray(reviews?.unresolvedCredits) ? reviews.unresolvedCredits : [];
  for (const [index, entry] of unresolvedCredits.entries()) {
    const prefix = `reviews.unresolvedCredits[${index}]`;
    if (!entry?.sourceLabel) blockers.push(`${prefix}.sourceLabel is required`);
    if (!Number.isInteger(entry?.count) || entry.count < 1) {
      blockers.push(`${prefix}.count must be a positive integer`);
      continue;
    }
    if (!entry?.reason) blockers.push(`${prefix}.reason is required`);
    unresolvedCreditCount += entry.count;
  }

  let quarantinedHistoricalCreditCount = 0;
  const quarantinedHistoricalCredits = Array.isArray(reviews?.quarantinedHistoricalCredits)
    ? reviews.quarantinedHistoricalCredits
    : [];
  for (const [index, entry] of quarantinedHistoricalCredits.entries()) {
    const prefix = `reviews.quarantinedHistoricalCredits[${index}]`;
    if (!entry?.sourceLabel) blockers.push(`${prefix}.sourceLabel is required`);
    if (!Number.isInteger(entry?.count) || entry.count < 1) {
      blockers.push(`${prefix}.count must be a positive integer`);
      continue;
    }
    if (entry?.creditPolicy !== 'QUARANTINED_NON_CREDITING') {
      blockers.push(`${prefix}.creditPolicy must be QUARANTINED_NON_CREDITING`);
    }
    if (!entry?.reason) blockers.push(`${prefix}.reason is required`);
    quarantinedHistoricalCreditCount += entry.count;
  }

  const uniqueExactReviewed = exactReviewedByFilename.size;
  const documentedReviewedTotal = uniqueExactReviewed + unresolvedCreditCount;
  const historicalClaimsTotal = documentedReviewedTotal + quarantinedHistoricalCreditCount;
  const exactUnmatchedItems = inventoryItems
    .filter((item) => !exactReviewedByFilename.has(item.filename))
    .sort(stableItemSort);
  const documentedRemaining = inventoryItems.length - documentedReviewedTotal;

  if (documentedReviewedTotal > inventoryItems.length) {
    blockers.push('documented reviewed total exceeds inventory size');
  }
  if (historicalClaimsTotal > inventoryItems.length) {
    blockers.push('historical claims total exceeds inventory size');
  }
  if (unresolvedCreditCount > exactUnmatchedItems.length) {
    blockers.push('unresolved credits exceed exact unmatched inventory items');
  }
  if (
    Number.isInteger(reviews?.expectedDocumentedReviewedTotal)
    && reviews.expectedDocumentedReviewedTotal !== documentedReviewedTotal
  ) {
    blockers.push(
      `documented reviewed total mismatch: expected ${reviews.expectedDocumentedReviewedTotal}, calculated ${documentedReviewedTotal}`,
    );
  }
  if (
    Number.isInteger(reviews?.expectedHistoricalClaimsTotal)
    && reviews.expectedHistoricalClaimsTotal !== historicalClaimsTotal
  ) {
    blockers.push(
      `historical claims total mismatch: expected ${reviews.expectedHistoricalClaimsTotal}, calculated ${historicalClaimsTotal}`,
    );
  }

  let status = 'READY_FOR_NEXT_HUMAN_REVIEW_BATCH';
  if (blockers.length > 0) {
    status = 'BLOCKED';
  } else if (unresolvedCreditCount > 0) {
    status = 'PROVENANCE_RECONSTRUCTION_REQUIRED';
  } else if (uniqueExactReviewed === inventoryItems.length) {
    status = 'OWNER_REVIEW_CLASSIFICATION_COMPLETE';
  }

  const safeNextBatchAvailable = status === 'READY_FOR_NEXT_HUMAN_REVIEW_BATCH';
  const nextHumanReviewBatch = safeNextBatchAvailable
    ? exactUnmatchedItems.slice(0, batchSize).map((item) => ({
      version: item.version ?? null,
      filename: item.filename,
      sha256: item.sha256,
      classificationReasons: item.classificationReasons ?? [],
      decision: null,
      reviewer: null,
      reviewedAt: null,
    }))
    : [];

  return {
    schema: LEDGER_SCHEMA,
    generatedAt: new Date().toISOString(),
    status,
    subjectSha: reviews?.subjectSha ?? null,
    inventorySha256,
    counts: {
      inventoryItems: inventoryItems.length,
      reviewRows: reviewRecords.length,
      uniqueExactReviewed,
      reaffirmations: reaffirmations.length,
      unresolvedCredits: unresolvedCreditCount,
      quarantinedHistoricalCredits: quarantinedHistoricalCreditCount,
      documentedReviewedTotal,
      historicalClaimsTotal,
      exactUnmatchedItems: exactUnmatchedItems.length,
      documentedRemaining: Math.max(0, documentedRemaining),
      nextBatchItems: nextHumanReviewBatch.length,
    },
    blockers,
    unresolvedCredits,
    quarantinedHistoricalCredits,
    reaffirmations,
    exactReviewed: [...exactReviewedByFilename.values()].sort(stableItemSort),
    nextHumanReviewBatch,
    safety: {
      automaticClassificationAllowed: false,
      quarantinedHistoricalCreditsAreCredited: false,
      nextBatchSelectionAuthorized: safeNextBatchAvailable,
      canonicalDecisionAccepted: false,
      stagingExecutionAuthorized: false,
      migrationExecutionAuthorized: false,
      migrationHistoryMutationAuthorized: false,
      productionWriteAuthorized: false,
    },
    nonCreditingNotice: 'This ledger validates human-review provenance and deduplicates exact migration fingerprints. Quarantined historical claims contribute zero exact-fingerprint credit. It never creates a migration classification, independent approval, staging authorization, migration-history repair authorization, or production authorization.',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((argument) => !argument.startsWith('--'));
  const [inventoryPath, reviewsPath, outputPath = 'artifacts/supabase-migration-owner-review-ledger/ledger.json'] = positional;
  const batchSizeArgument = args.find((argument) => argument.startsWith('--batch-size='));
  const batchSize = Number(batchSizeArgument?.split('=')[1] ?? 15);

  if (!inventoryPath || !reviewsPath) {
    throw new Error('usage: inventory.json owner-review-records.json [output.json] [--batch-size=15]');
  }

  const inventoryBytes = await readFile(inventoryPath);
  const reviewsBytes = await readFile(reviewsPath);
  const ledger = buildOwnerReviewLedger({
    inventory: JSON.parse(inventoryBytes.toString('utf8')),
    inventorySha256: sha256(inventoryBytes),
    reviews: JSON.parse(reviewsBytes.toString('utf8')),
    batchSize,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(ledger, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: ledger.status,
    counts: ledger.counts,
    blockers: ledger.blockers,
    safety: ledger.safety,
  }, null, 2)}\n`);

  if (!['READY_FOR_NEXT_HUMAN_REVIEW_BATCH', 'OWNER_REVIEW_CLASSIFICATION_COMPLETE'].includes(ledger.status)) {
    process.exitCode = 2;
  }
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
