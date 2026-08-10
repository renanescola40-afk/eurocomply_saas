import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseReviewEvidence } from './normalize-migration-owner-review-evidence.mjs';

describe('migration owner-review evidence parser', () => {
  it('parses numbered fixed-classification decisions', () => {
    const config = {
      batch: 'F',
      path: 'batch-f.md',
      mode: 'numbered',
      fixedClassification: 'PENDING_DEPLOYMENT',
      expectedRows: 2,
      fallbackReviewedAt: '2026-08-10',
    };
    const markdown = [
      'Date: 2026-08-10',
      '1. F1 — `20260101000000_alpha.sql`',
      '2. F2 — `20260101000100_beta.sql`',
    ].join('\n');

    const rows = parseReviewEvidence(config, markdown);
    assert.deepEqual(rows.map(({ filename, classification }) => ({ filename, classification })), [
      { filename: '20260101000000_alpha.sql', classification: 'PENDING_DEPLOYMENT' },
      { filename: '20260101000100_beta.sql', classification: 'PENDING_DEPLOYMENT' },
    ]);
  });

  it('parses table classifications while ignoring execution-boundary suffixes', () => {
    const config = {
      batch: 'N',
      path: 'batch-n.md',
      mode: 'table',
      expectedRows: 2,
    };
    const markdown = [
      'Reviewed at: **2026-08-10T17:22:00+01:00**',
      '| ID | Migration | Approved classification | Boundary |',
      '| --- | --- | --- | --- |',
      '| N1 | `20260101000000_alpha.sql` | `PENDING_DEPLOYMENT` | ok |',
      '| N2 | `20260101000100_beta.sql` | `REQUIRES_SPLIT_REVIEW` | blocked |',
    ].join('\n');

    const rows = parseReviewEvidence(config, markdown);
    assert.equal(rows[0].classification, 'PENDING_DEPLOYMENT');
    assert.equal(rows[1].classification, 'REQUIRES_SPLIT_REVIEW');
    assert.equal(rows[0].reviewedAt, '2026-08-10T17:22:00+01:00');
  });

  it('parses only bullet migrations inside duplicate-version section', () => {
    const config = {
      batch: 'I',
      path: 'batch-i.md',
      mode: 'duplicate-bullets',
      fixedClassification: 'REQUIRES_SPLIT_REVIEW',
      expectedRows: 2,
      fallbackReviewedAt: '2026-08-10',
    };
    const markdown = [
      'Reviewed at: **2026-08-10T11:16:00+01:00**',
      '`20260101999999_not_a_group_item.sql` is already classified elsewhere.',
      '## Approved duplicate-version groups',
      '- `20260101000000_alpha.sql`',
      '- `20260101000100_beta.sql`',
      '## Classification summary',
      '- `20260101999999_not_a_group_item.sql`',
    ].join('\n');

    const rows = parseReviewEvidence(config, markdown);
    assert.deepEqual(rows.map((row) => row.filename), [
      '20260101000000_alpha.sql',
      '20260101000100_beta.sql',
    ]);
  });

  it('fails closed when expected evidence rows disappear', () => {
    const config = {
      batch: 'G',
      path: 'batch-g.md',
      mode: 'table',
      expectedRows: 2,
      fallbackReviewedAt: '2026-08-10',
    };
    const markdown = '| G1 | `20260101000000_alpha.sql` | `PENDING_DEPLOYMENT` |';

    assert.throws(
      () => parseReviewEvidence(config, markdown),
      /expected 2 review rows, parsed 1/,
    );
  });
});
