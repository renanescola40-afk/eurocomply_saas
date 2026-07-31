import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { classifyCounselReviewImpact } from '../../scripts/compliance/build-counsel-review-delta.mjs';

function catalog() {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), 'docs/legal-review-preparation/counsel-efficiency/COUNSEL_DECISION_CATALOG.json'),
      'utf8',
    ),
  );
}

const base = 'a'.repeat(40);
const head = 'b'.repeat(40);

describe('counsel review efficiency closeout', () => {
  it('keeps the catalogue non-crediting and complete', () => {
    const value = catalog();

    expect(value.status).toBe('HUMAN_REVIEW_REQUIRED');
    expect(value.globalDecisions).toHaveLength(10);
    expect(value.workstreams).toHaveLength(8);
    expect(value.workstreams.every((item: { decision: string }) => item.decision === 'HUMAN_REVIEW_REQUIRED')).toBe(true);
  });

  it('requires full re-review for intended-purpose changes', () => {
    const result = classifyCounselReviewImpact({
      changedFiles: ['docs/legal-review-preparation/02_INTENDED_PURPOSE.md'],
      catalog: catalog(),
      baseSha: base,
      headSha: head,
    });

    expect(result.reviewLevel).toBe('FULL_COUNSEL_REREVIEW_REQUIRED');
    expect(result.affectedDecisionIds).toContain('G-01');
    expect(result.affectedWorkstreams).toHaveLength(8);
    expect(result.counselAccepted).toBe(false);
    expect(result.legalAcceptanceStatus).toBe('HUMAN_REVIEW_REQUIRED');
  });

  it('routes contract and privacy changes to limited re-review', () => {
    const result = classifyCounselReviewImpact({
      changedFiles: ['docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md'],
      catalog: catalog(),
      baseSha: base,
      headSha: head,
    });

    expect(result.reviewLevel).toBe('LIMITED_COUNSEL_REREVIEW_REQUIRED');
    expect(result.affectedDecisionIds).toEqual(expect.arrayContaining(['G-06', 'G-07', 'G-08', 'G-09']));
    expect(result.counselAccepted).toBe(false);
  });

  it('does not require counsel re-review for a non-substantive ADR-only change', () => {
    const result = classifyCounselReviewImpact({
      changedFiles: ['docs/architecture/decisions/2026-07-30-example.md'],
      catalog: catalog(),
      baseSha: base,
      headSha: head,
    });

    expect(result.reviewLevel).toBe('NO_COUNSEL_REREVIEW_REQUIRED');
    expect(result.affectedDecisionIds).toEqual([]);
    expect(result.affectedWorkstreams).toEqual([]);
  });

  it('fails closed for an unclassified production source change', () => {
    const result = classifyCounselReviewImpact({
      changedFiles: ['src/server/new-autonomous-feature.ts'],
      catalog: catalog(),
      baseSha: base,
      headSha: head,
    });

    expect(result.reviewLevel).toBe('LIMITED_COUNSEL_REREVIEW_REQUIRED');
    expect(result.affectedDecisionIds).toContain('G-10');
    expect(result.fallbackMatches).toHaveLength(1);
  });

  it('requires a full review when no reviewed base SHA is supplied', () => {
    const result = classifyCounselReviewImpact({
      changedFiles: [],
      catalog: catalog(),
      baseSha: null,
      headSha: head,
    });

    expect(result.reviewLevel).toBe('FULL_COUNSEL_REREVIEW_REQUIRED');
    expect(result.affectedDecisionIds).toHaveLength(10);
    expect(result.affectedWorkstreams).toHaveLength(8);
    expect(result.preparationStatus).toBe('DELTA_PREPARED');
  });

  it('produces the same digest for the same material delta', () => {
    const input = {
      changedFiles: ['src/app/[locale]/dashboard/transparencia/page.tsx'],
      catalog: catalog(),
      baseSha: base,
      headSha: head,
    };

    expect(classifyCounselReviewImpact(input).deltaDigest).toBe(
      classifyCounselReviewImpact(input).deltaDigest,
    );
  });
});
