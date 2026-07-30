import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type MatrixEntry = {
  article: string;
  paragraph: string | null;
  legalRole: string[];
  obligation: string;
  applicability: string;
  functionality: string[];
  api: string[];
  table: string[];
  test: string[];
  runtimeEvidence: string[];
  humanReviewEvidence: string[];
  status: string;
  limitation: string;
  sourceVersion: string;
  lastVerifiedDate: string;
};

const matrix = JSON.parse(
  readFileSync(resolve('docs/compliance/article-function-evidence-registry.v1.json'), 'utf8'),
) as { schema: string; version: string; entries: MatrixEntry[] };

describe('article to function and evidence registry', () => {
  it('is versioned and contains complete required fields', () => {
    expect(matrix.schema).toBe('risck-comply.article-function-evidence-registry.v1');
    expect(matrix.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(matrix.entries.length).toBeGreaterThanOrEqual(12);

    for (const entry of matrix.entries) {
      expect(entry.article).toBeTruthy();
      expect(Array.isArray(entry.legalRole)).toBe(true);
      expect(entry.obligation).toBeTruthy();
      expect(entry.applicability).toBeTruthy();
      expect(Array.isArray(entry.functionality)).toBe(true);
      expect(Array.isArray(entry.api)).toBe(true);
      expect(Array.isArray(entry.table)).toBe(true);
      expect(Array.isArray(entry.test)).toBe(true);
      expect(Array.isArray(entry.runtimeEvidence)).toBe(true);
      expect(Array.isArray(entry.humanReviewEvidence)).toBe(true);
      expect(entry.status).toBeTruthy();
      expect(entry.limitation).toBeTruthy();
      expect(entry.sourceVersion).toBeTruthy();
      expect(entry.lastVerifiedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('requires an explicit justification for every NOT_APPLICABLE row', () => {
    const notApplicable = matrix.entries.filter((entry) => entry.status === 'NOT_APPLICABLE');
    expect(notApplicable.length).toBeGreaterThan(0);
    for (const entry of notApplicable) {
      expect(entry.article).toBe('NOT_APPLICABLE');
      expect(entry.applicability).toMatch(/NOT_APPLICABLE/);
      expect(entry.limitation.length).toBeGreaterThan(30);
    }
  });

  it('does not claim accepted runtime proof for the legal-rules placeholder', () => {
    const legalRulesEntries = matrix.entries.filter((entry) =>
      entry.runtimeEvidence.includes('docs/security/evidence/runtime/legal-rules-validation.json'),
    );
    expect(legalRulesEntries.length).toBeGreaterThan(0);
    expect(legalRulesEntries.every((entry) =>
      ['IMPLEMENTED_RUNTIME_PENDING', 'HUMAN_REVIEW_REQUIRED'].includes(entry.status),
    )).toBe(true);
  });

  it('uses repository-relative safe evidence paths', () => {
    for (const entry of matrix.entries) {
      for (const path of [...entry.test, ...entry.runtimeEvidence, ...entry.humanReviewEvidence]) {
        expect(path.startsWith('/')).toBe(false);
        expect(path.includes('..')).toBe(false);
      }
    }
  });
});
