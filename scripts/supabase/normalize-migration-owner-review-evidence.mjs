#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const INVENTORY_SCHEMA = 'risck-comply.supabase-migration-reconciliation-inventory.v1';
const REVIEW_SCHEMA = 'risck-comply.supabase-migration-owner-review-records.v1';
const ALLOWED_CLASSIFICATIONS = [
  'ALREADY_PRESENT_IN_SCHEMA',
  'PENDING_DEPLOYMENT',
  'SUPERSEDED',
  'ARCHIVE_LEGACY',
  'REQUIRES_SPLIT_REVIEW',
];

const REVIEWER = 'Renan Rodrigues Cerqueira da Silva';
const REVIEWER_ROLE = 'Repository owner / human classification reviewer';

export const SOURCE_CONFIG = [
  {
    batch: 'F',
    path: 'docs/security/decisions/2026-08-10-supabase-human-review-mega-batch-f.md',
    mode: 'numbered',
    fixedClassification: 'PENDING_DEPLOYMENT',
    expectedRows: 13,
    fallbackReviewedAt: '2026-08-10',
  },
  {
    batch: 'G',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-g.md',
    mode: 'table',
    expectedRows: 14,
    fallbackReviewedAt: '2026-08-10',
  },
  {
    batch: 'H',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-h.md',
    mode: 'table',
    expectedRows: 12,
  },
  {
    batch: 'I',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-i.md',
    mode: 'duplicate-bullets',
    fixedClassification: 'REQUIRES_SPLIT_REVIEW',
    expectedRows: 38,
  },
  {
    batch: 'J',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-j.md',
    mode: 'table',
    expectedRows: 15,
  },
  {
    batch: 'K',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-k.md',
    mode: 'table',
    expectedRows: 15,
  },
  {
    batch: 'L',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-l.md',
    mode: 'table',
    expectedRows: 15,
  },
  {
    batch: 'M',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-m.md',
    mode: 'table',
    expectedRows: 15,
  },
  {
    batch: 'N',
    path: 'docs/security/evidence/human-review/supabase-migration-mega-batch-n.md',
    mode: 'table',
    expectedRows: 15,
  },
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function cleanCell(value) {
  return value.replaceAll('`', '').replaceAll('*', '').trim();
}

function classificationFromText(value) {
  const cleaned = cleanCell(value);
  return ALLOWED_CLASSIFICATIONS.find((classification) => cleaned.includes(classification)) ?? null;
}

function reviewedAtFromMarkdown(markdown, fallback) {
  const exact = markdown.match(/Reviewed at:\s*\*\*([^*]+)\*\*/i)?.[1]?.trim();
  if (exact) return exact;
  const date = markdown.match(/^Date:\s*(\d{4}-\d{2}-\d{2})\s*$/im)?.[1];
  return date ?? fallback ?? null;
}

export function parseReviewEvidence(config, markdown) {
  const rows = [];
  const lines = markdown.split(/\r?\n/);

  if (config.mode === 'numbered') {
    for (const line of lines) {
      const match = line.match(/^\s*\d+\.\s+[A-Z]\d+\s+—\s+`([^`]+\.sql)`/);
      if (!match) continue;
      rows.push({
        filename: match[1],
        classification: config.fixedClassification,
      });
    }
  } else if (config.mode === 'duplicate-bullets') {
    const sectionStart = markdown.indexOf('## Approved duplicate-version groups');
    const sectionEnd = markdown.indexOf('## Classification summary');
    if (sectionStart < 0 || sectionEnd <= sectionStart) {
      throw new Error(`Batch ${config.batch}: duplicate-version section boundaries not found`);
    }
    const section = markdown.slice(sectionStart, sectionEnd);
    for (const line of section.split(/\r?\n/)) {
      const match = line.match(/^\s*-\s+`([^`]+\.sql)`\s*$/);
      if (!match) continue;
      rows.push({
        filename: match[1],
        classification: config.fixedClassification,
      });
    }
  } else if (config.mode === 'table') {
    for (const line of lines) {
      if (!line.trim().startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (!new RegExp(`^${config.batch}\\d+$`).test(cleanCell(cells[0] ?? ''))) continue;
      const filename = cleanCell(cells[1] ?? '');
      if (!filename.endsWith('.sql')) continue;
      const classification = cells
        .slice(2)
        .map(classificationFromText)
        .find(Boolean);
      if (!classification) {
        throw new Error(`Batch ${config.batch}: classification not found for ${filename}`);
      }
      rows.push({ filename, classification });
    }
  } else {
    throw new Error(`Batch ${config.batch}: unsupported parse mode ${config.mode}`);
  }

  if (rows.length !== config.expectedRows) {
    throw new Error(
      `Batch ${config.batch}: expected ${config.expectedRows} review rows, parsed ${rows.length}`,
    );
  }

  const reviewedAt = reviewedAtFromMarkdown(markdown, config.fallbackReviewedAt);
  if (!reviewedAt || Number.isNaN(new Date(reviewedAt).getTime())) {
    throw new Error(`Batch ${config.batch}: valid reviewedAt could not be reconstructed`);
  }

  return rows.map((row) => ({
    ...row,
    sourceEvidencePath: config.path,
    reviewer: REVIEWER,
    reviewerRole: REVIEWER_ROLE,
    reviewedAt,
    batch: config.batch,
  }));
}

export function normalizeOwnerReviewEvidence({
  inventory,
  inventorySha256,
  evidenceByPath,
}) {
  if (inventory?.schema !== INVENTORY_SCHEMA || !Array.isArray(inventory?.items)) {
    throw new Error('unsupported reconciliation inventory');
  }

  const inventoryByFilename = new Map(
    inventory.items.map((item) => [item.filename, item]),
  );
  const records = [];

  for (const config of SOURCE_CONFIG) {
    const markdown = evidenceByPath.get(config.path);
    if (typeof markdown !== 'string') {
      throw new Error(`missing review evidence: ${config.path}`);
    }

    const parsed = parseReviewEvidence(config, markdown);
    for (const row of parsed) {
      const item = inventoryByFilename.get(row.filename);
      if (!item) {
        throw new Error(`reviewed file not present in immutable inventory: ${row.filename}`);
      }
      if (!/^[a-f0-9]{64}$/i.test(String(item.sha256 ?? ''))) {
        throw new Error(`invalid inventory SQL digest: ${row.filename}`);
      }
      records.push({
        batch: row.batch,
        filename: row.filename,
        sha256: item.sha256,
        classification: row.classification,
        sourceEvidencePath: row.sourceEvidencePath,
        reviewer: row.reviewer,
        reviewerRole: row.reviewerRole,
        reviewedAt: row.reviewedAt,
      });
    }
  }

  const byFilename = new Map();
  let reaffirmations = 0;
  for (const record of records) {
    const existing = byFilename.get(record.filename);
    if (!existing) {
      byFilename.set(record.filename, record);
      continue;
    }
    if (
      existing.sha256.toLowerCase() !== record.sha256.toLowerCase()
      || existing.classification !== record.classification
    ) {
      throw new Error(`conflicting normalized review evidence: ${record.filename}`);
    }
    reaffirmations += 1;
  }

  if (records.length !== 152) {
    throw new Error(`expected 152 F-N review rows, normalized ${records.length}`);
  }
  if (byFilename.size !== 143) {
    throw new Error(`expected 143 exact F-N filenames, normalized ${byFilename.size}`);
  }
  if (reaffirmations !== 9) {
    throw new Error(`expected 9 reaffirmations, normalized ${reaffirmations}`);
  }

  return {
    schema: REVIEW_SCHEMA,
    generatedAt: new Date().toISOString(),
    subjectSha: 'def59573bf2dbd2ad447f8f493048b0296be21ff',
    inventorySha256,
    expectedDocumentedReviewedTotal: 143,
    expectedHistoricalClaimsTotal: 145,
    normalizationSummary: {
      sourceBatches: SOURCE_CONFIG.map(({ batch }) => batch),
      reviewRows: records.length,
      uniqueExactReviewed: byFilename.size,
      reaffirmations,
      quarantinedHistoricalCredits: 2,
    },
    records,
    unresolvedCredits: [],
    quarantinedHistoricalCredits: [
      {
        sourceLabel: 'Mega Batch E',
        count: 2,
        consolidatedEvidencePath:
          'docs/security/evidence/human-review/supabase-migration-mega-batch-h.md',
        creditPolicy: 'QUARANTINED_NON_CREDITING',
        reason:
          'Batch H preserves two current-inventory classification credits from Batch E, but exact immutable filename + SQL SHA-256 fingerprints were not recovered. These claims remain historical evidence and contribute zero exact-fingerprint ledger credit until re-reviewed or reconstructed.',
      },
    ],
    nonCreditingNotice:
      'This normalization transcribes existing owner-reviewed F-N classifications to exact inventory fingerprints. It creates no new migration classification, owner approval, independent approval, staging authorization, migration execution authorization, history-repair authorization, or production authorization.',
  };
}

async function main() {
  const [inventoryPath, outputPath = 'artifacts/supabase-migration-owner-review/owner-review-records.json'] =
    process.argv.slice(2);

  if (!inventoryPath) {
    throw new Error('usage: migration-reconciliation-inventory.json [owner-review-records.json]');
  }

  const inventoryBytes = await readFile(inventoryPath);
  const evidenceByPath = new Map();
  for (const config of SOURCE_CONFIG) {
    evidenceByPath.set(config.path, await readFile(config.path, 'utf8'));
  }

  const normalized = normalizeOwnerReviewEvidence({
    inventory: JSON.parse(inventoryBytes.toString('utf8')),
    inventorySha256: sha256(inventoryBytes),
    evidenceByPath,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(normalized.normalizationSummary, null, 2)}\n`);
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
