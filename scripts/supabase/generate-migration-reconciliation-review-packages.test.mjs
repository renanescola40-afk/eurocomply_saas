import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.resolve(
  'scripts/supabase/generate-migration-reconciliation-review-packages.mjs',
);
const temporaryRoots = [];

function createInventory(items) {
  return {
    schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
    generatedAt: '2026-07-30T20:00:00.000Z',
    allowedClassifications: [
      'ALREADY_PRESENT_IN_SCHEMA',
      'PENDING_DEPLOYMENT',
      'SUPERSEDED',
      'ARCHIVE_LEGACY',
      'REQUIRES_SPLIT_REVIEW',
    ],
    items,
  };
}

function item(filename, version, reason) {
  return {
    version,
    filename,
    sha256: createHash('sha256').update(filename).digest('hex'),
    byteLength: filename.length,
    duplicateVersion: reason === 'DUPLICATE_VERSION',
    classificationReasons: [reason],
    classification: 'UNCLASSIFIED',
    allowedClassifications: [
      'ALREADY_PRESENT_IN_SCHEMA',
      'PENDING_DEPLOYMENT',
      'SUPERSEDED',
      'ARCHIVE_LEGACY',
      'REQUIRES_SPLIT_REVIEW',
    ],
    rationale: null,
    reviewer: null,
  };
}

function runGenerator(inventory, batchSize = 2) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'migration-review-packages-'));
  temporaryRoots.push(root);
  const inventoryPath = path.join(root, 'inventory.json');
  const outputDir = path.join(root, 'output');
  const bytes = `${JSON.stringify(inventory, null, 2)}\n`;
  writeFileSync(inventoryPath, bytes);
  const result = spawnSync(
    process.execPath,
    [scriptPath, inventoryPath, outputDir, `--batch-size=${batchSize}`],
    { encoding: 'utf8' },
  );
  return { root, inventoryPath, outputDir, bytes, result };
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});

describe('migration reconciliation review packages', () => {
  it('splits unresolved migrations deterministically without crediting decisions', () => {
    const inventory = createInventory([
      item('20260730120300_c.sql', '20260730120300', 'LOCAL_ONLY_VERSION'),
      item('20260730120100_a.sql', '20260730120100', 'LOCAL_ONLY_VERSION'),
      item('20260730120200_b.sql', '20260730120200', 'DUPLICATE_VERSION'),
    ]);
    const { outputDir, bytes, result } = runGenerator(inventory, 2);

    expect(result.status).toBe(0);
    const index = JSON.parse(readFileSync(path.join(outputDir, 'index.json'), 'utf8'));
    const first = JSON.parse(
      readFileSync(path.join(outputDir, 'batch-001-of-002.json'), 'utf8'),
    );
    const second = JSON.parse(
      readFileSync(path.join(outputDir, 'batch-002-of-002.json'), 'utf8'),
    );

    expect(index).toMatchObject({
      status: 'HUMAN_REVIEW_REQUIRED',
      batchSize: 2,
      packageCount: 2,
      itemCount: 3,
      acceptedDecisions: 0,
      inventorySha256: createHash('sha256').update(bytes).digest('hex'),
    });
    expect(first.items.map((entry) => entry.filename)).toEqual([
      '20260730120100_a.sql',
      '20260730120200_b.sql',
    ]);
    expect(second.items.map((entry) => entry.filename)).toEqual([
      '20260730120300_c.sql',
    ]);
    for (const reviewItem of [...first.items, ...second.items]) {
      expect(reviewItem.decision).toMatchObject({
        classification: null,
        rationale: null,
        reviewer: null,
        reviewedAt: null,
        decisionDigest: null,
      });
    }
  });

  it('writes paired JSON and Markdown packages plus an index', () => {
    const inventory = createInventory([
      item('20260730120100_a.sql', '20260730120100', 'LOCAL_ONLY_VERSION'),
      item('20260730120200_b.sql', '20260730120200', 'DUPLICATE_VERSION'),
    ]);
    const { outputDir, result } = runGenerator(inventory, 1);

    expect(result.status).toBe(0);
    expect(readdirSync(outputDir).sort()).toEqual([
      'batch-001-of-002.json',
      'batch-001-of-002.md',
      'batch-002-of-002.json',
      'batch-002-of-002.md',
      'index.json',
      'index.md',
    ]);
    const markdown = readFileSync(
      path.join(outputDir, 'batch-001-of-002.md'),
      'utf8',
    );
    expect(markdown).toContain('HUMAN_REVIEW_REQUIRED');
    expect(markdown).toContain('This package is preparation material only');
    expect(markdown).toContain('must not use `supabase migration repair --status applied`');
  });

  it('rejects inventories containing pre-filled human decisions', () => {
    const prefilled = item(
      '20260730120100_a.sql',
      '20260730120100',
      'LOCAL_ONLY_VERSION',
    );
    prefilled.classification = 'ALREADY_PRESENT_IN_SCHEMA';
    prefilled.reviewer = 'Example Reviewer';
    const { result, outputDir } = runGenerator(createInventory([prefilled]), 25);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('classification must remain UNCLASSIFIED');
    expect(result.stderr).toContain('contains pre-filled human review data');
    expect(() => readdirSync(outputDir)).toThrow();
  });

  it('rejects unsafe batch sizes', () => {
    const { result } = runGenerator(
      createInventory([
        item('20260730120100_a.sql', '20260730120100', 'LOCAL_ONLY_VERSION'),
      ]),
      0,
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--batch-size must be an integer between 1 and 100');
  });
});
