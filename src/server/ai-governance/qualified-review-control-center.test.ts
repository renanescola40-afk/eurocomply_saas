import { describe, expect, it } from 'vitest';
import { evaluateQualifiedReviewControlCenter, QUALIFIED_REVIEW_WORKSTREAMS } from './qualified-review-control-center';

describe('qualified review control center', () => {
  it('requires all eight accepted workstreams totaling 51 points', () => {
    const result = evaluateQualifiedReviewControlCenter(QUALIFIED_REVIEW_WORKSTREAMS.map((item) => ({ workstream_id: item.id, weight: item.weight, status: 'accepted' })));
    expect(result.technicallyReady).toBe(true);
    expect(result.acceptedWeight).toBe(51);
    expect(result.assignmentCount).toBe(8);
    expect(result.blockers).toEqual([]);
  });

  it('fails closed for missing, duplicate, unknown and weight-mismatched workstreams', () => {
    const result = evaluateQualifiedReviewControlCenter([
      { workstream_id: 'LEGAL-RULES', weight: 99, status: 'accepted' },
      { workstream_id: 'LEGAL-RULES', weight: 4, status: 'accepted' },
      { workstream_id: 'UNKNOWN', weight: 1, status: 'accepted' },
    ]);
    expect(result.technicallyReady).toBe(false);
    expect(result.blockers.some((item) => item.startsWith('duplicate_workstream'))).toBe(true);
    expect(result.blockers.some((item) => item.startsWith('unknown_workstream'))).toBe(true);
    expect(result.blockers.some((item) => item.startsWith('missing_workstream'))).toBe(true);
  });

  it('reports overdue active reviews without promoting them', () => {
    const result = evaluateQualifiedReviewControlCenter([
      { workstream_id: 'LEGAL-RULES', weight: 4, status: 'in_review', due_at: '2026-01-01T00:00:00.000Z' },
    ], new Date('2026-07-27T00:00:00.000Z'));
    expect(result.overdueCount).toBe(1);
    expect(result.technicallyReady).toBe(false);
  });
});
