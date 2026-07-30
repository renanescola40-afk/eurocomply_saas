#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((argument) => !argument.startsWith('--'));
const inventoryPath = positional[0]
  ?? 'artifacts/supabase-migration-drift/migration-reconciliation-inventory.json';
const outputDir = positional[1]
  ?? 'artifacts/supabase-migration-reconciliation-review';
const batchSizeArgument = args.find((argument) => argument.startsWith('--batch-size='));
const batchSize = Number(batchSizeArgument?.split('=')[1] ?? 25);

function fail(message) {
  console.error(`Migration reconciliation review package generation failed: ${message}`);
  process.exit(1);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableItemSort(left, right) {
  return [left.version ?? '', left.filename, left.sha256]
    .join(':')
    .localeCompare([right.version ?? '', right.filename, right.sha256].join(':'));
}

function validateInventory(inventory) {
  const failures = [];
  if (inventory?.schema !== 'risck-comply.supabase-migration-reconciliation-inventory.v1') {
    failures.push('unsupported inventory schema');
  }
  if (!Array.isArray(inventory?.items)) failures.push('inventory items must be an array');
  if (!Array.isArray(inventory?.allowedClassifications)) {
    failures.push('allowedClassifications must be an array');
  }

  for (const [index, item] of (inventory?.items ?? []).entries()) {
    const prefix = `items[${index}]`;
    if (!item?.filename) failures.push(`${prefix}.filename is required`);
    if (!/^[a-f0-9]{64}$/i.test(String(item?.sha256 ?? ''))) {
      failures.push(`${prefix}.sha256 must be a SHA-256 digest`);
    }
    if (!Array.isArray(item?.classificationReasons) || item.classificationReasons.length === 0) {
      failures.push(`${prefix}.classificationReasons must be non-empty`);
    }
    if (item?.classification !== 'UNCLASSIFIED') {
      failures.push(`${prefix}.classification must remain UNCLASSIFIED`);
    }
    if (item?.reviewer !== null || item?.rationale !== null) {
      failures.push(`${prefix} contains pre-filled human review data`);
    }
  }

  return failures;
}

function buildReviewItem(item, allowedClassifications) {
  return {
    version: item.version,
    filename: item.filename,
    sha256: item.sha256,
    byteLength: item.byteLength,
    duplicateVersion: item.duplicateVersion === true,
    classificationReasons: item.classificationReasons,
    decision: {
      classification: null,
      allowedClassifications,
      rationale: null,
      schemaEvidenceReference: null,
      replacementMigrationDigest: null,
      stagedExecutionEvidenceReference: null,
      deployOrderDecision: null,
      rollbackReference: null,
      reviewer: null,
      reviewerRole: null,
      reviewedAt: null,
      decisionDigest: null,
    },
  };
}

function renderPackageMarkdown(reviewPackage) {
  const lines = [
    `# Supabase Migration Reconciliation Review — ${reviewPackage.packageId}`,
    '',
    `**Status:** \`${reviewPackage.status}\``,
    '',
    `- Inventory SHA-256: \`${reviewPackage.inventorySha256}\``,
    `- Package: ${reviewPackage.packageNumber}/${reviewPackage.packageCount}`,
    `- Items: ${reviewPackage.items.length}`,
    `- Source generated at: ${reviewPackage.inventoryGeneratedAt}`,
    '',
    '## Review boundary',
    '',
    'This package is preparation material only. No classification, schema conclusion, deploy order, rollback conclusion, migration-history repair, or production authorization is implied.',
    '',
    'For every item, the reviewer must inspect the exact SQL digest and provide evidence appropriate to the selected classification.',
    '',
    '## Items',
    '',
    '| File | Version | SHA-256 | Reasons | Decision |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const item of reviewPackage.items) {
    lines.push(
      `| \`${item.filename}\` | \`${item.version ?? 'invalid'}\` | \`${item.sha256}\` | ${item.classificationReasons.map((reason) => `\`${reason}\``).join(', ')} | Human review required |`,
    );
  }

  lines.push(
    '',
    '## Classification evidence requirements',
    '',
    '- `ALREADY_PRESENT_IN_SCHEMA`: object-level production schema evidence and migration SQL mapping.',
    '- `PENDING_DEPLOYMENT`: staged execution evidence, ordering decision, backup and rollback references.',
    '- `SUPERSEDED`: replacement migration digest and proof that the replacement fully covers the intended state.',
    '- `ARCHIVE_LEGACY`: explicit confirmation that the file must never be executed and the controlled archival mapping.',
    '- `REQUIRES_SPLIT_REVIEW`: reviewer-scoped follow-up identifying the unresolved objects or statements.',
    '',
    'A reviewer must not use `supabase migration repair --status applied` unless the corresponding schema change is demonstrably present in the target database.',
    '',
  );
  return lines.join('\n');
}

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
  fail('--batch-size must be an integer between 1 and 100');
}

let inventoryBytes;
let inventory;
try {
  inventoryBytes = await readFile(inventoryPath);
  inventory = JSON.parse(inventoryBytes.toString('utf8'));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const failures = validateInventory(inventory);
if (failures.length > 0) {
  fail(failures.join('; '));
}

const inventorySha256 = sha256(inventoryBytes);
const sortedItems = [...inventory.items].sort(stableItemSort);
const packageCount = Math.max(1, Math.ceil(sortedItems.length / batchSize));
const reviewPackages = [];

for (let index = 0; index < packageCount; index += 1) {
  const packageNumber = index + 1;
  const packageId = `batch-${String(packageNumber).padStart(3, '0')}-of-${String(packageCount).padStart(3, '0')}`;
  const items = sortedItems
    .slice(index * batchSize, (index + 1) * batchSize)
    .map((item) => buildReviewItem(item, inventory.allowedClassifications));
  reviewPackages.push({
    schema: 'risck-comply.supabase-migration-reconciliation-review-package.v1',
    packageId,
    packageNumber,
    packageCount,
    status: 'HUMAN_REVIEW_REQUIRED',
    inventorySha256,
    inventoryGeneratedAt: inventory.generatedAt,
    generatedAt: new Date().toISOString(),
    sourceInventoryPath: inventoryPath,
    items,
    nonCreditingNotice: 'This generated package contains no accepted migration classification or production authorization.',
  });
}

const indexDocument = {
  schema: 'risck-comply.supabase-migration-reconciliation-review-index.v1',
  status: 'HUMAN_REVIEW_REQUIRED',
  inventorySha256,
  inventoryGeneratedAt: inventory.generatedAt,
  generatedAt: new Date().toISOString(),
  sourceInventoryPath: inventoryPath,
  batchSize,
  packageCount,
  itemCount: sortedItems.length,
  packages: reviewPackages.map((reviewPackage) => ({
    packageId: reviewPackage.packageId,
    packageNumber: reviewPackage.packageNumber,
    itemCount: reviewPackage.items.length,
    jsonPath: `${reviewPackage.packageId}.json`,
    markdownPath: `${reviewPackage.packageId}.md`,
  })),
  acceptedDecisions: 0,
  nonCreditingNotice: 'Package generation is not schema review, migration approval, migration-history repair, or production authorization.',
};

await mkdir(outputDir, { recursive: true });
for (const reviewPackage of reviewPackages) {
  await writeFile(
    path.join(outputDir, `${reviewPackage.packageId}.json`),
    `${JSON.stringify(reviewPackage, null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, `${reviewPackage.packageId}.md`),
    renderPackageMarkdown(reviewPackage),
  );
}
await writeFile(
  path.join(outputDir, 'index.json'),
  `${JSON.stringify(indexDocument, null, 2)}\n`,
);
await writeFile(
  path.join(outputDir, 'index.md'),
  [
    '# Supabase Migration Reconciliation Review Packages',
    '',
    `**Status:** \`${indexDocument.status}\``,
    '',
    `- Inventory SHA-256: \`${inventorySha256}\``,
    `- Items: ${indexDocument.itemCount}`,
    `- Packages: ${indexDocument.packageCount}`,
    `- Batch size: ${indexDocument.batchSize}`,
    `- Accepted decisions: ${indexDocument.acceptedDecisions}`,
    '',
    'These packages are non-crediting preparation material. Every classification requires explicit reviewer evidence and remains external to package generation.',
    '',
    ...indexDocument.packages.map((entry) => (
      `- \`${entry.packageId}\`: ${entry.itemCount} items — [JSON](./${entry.jsonPath}) · [Markdown](./${entry.markdownPath})`
    )),
    '',
  ].join('\n'),
);

console.log(JSON.stringify(indexDocument, null, 2));
