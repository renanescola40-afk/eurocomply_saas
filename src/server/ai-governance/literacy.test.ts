import { describe, expect, it } from 'vitest';

import {
  calculateAiLiteracyCoverage,
  evaluateAiLiteracyAssignment,
  type AiLiteracyAssignmentSnapshot,
} from './literacy';

const AS_OF = '2026-07-17T12:00:00.000Z';

function assignment(overrides: Partial<AiLiteracyAssignmentSnapshot> = {}): AiLiteracyAssignmentSnapshot {
  return {
    id: 'assignment-1',
    status: 'completed',
    dueAt: '2026-07-01T00:00:00.000Z',
    completedAt: '2026-06-30T00:00:00.000Z',
    validUntil: '2027-06-30T00:00:00.000Z',
    score: 90,
    passingScore: 80,
    acknowledgement: true,
    evidence: [{ status: 'approved', validUntil: '2027-06-30T00:00:00.000Z' }],
    ...overrides,
  };
}

describe('AI literacy assignment evaluation', () => {
  it('requires approved, valid evidence before treating completion as ready', () => {
    expect(evaluateAiLiteracyAssignment(assignment(), AS_OF)).toMatchObject({
      outcome: 'ready',
      score: 100,
    });

    expect(evaluateAiLiteracyAssignment(assignment({ evidence: [{ status: 'submitted' }] }), AS_OF)).toMatchObject({
      outcome: 'partial',
      score: 50,
      reasons: ['evidence_pending_review'],
    });
  });

  it('fails closed for expired training and overdue assignments', () => {
    expect(evaluateAiLiteracyAssignment(assignment({ validUntil: '2026-07-01T00:00:00.000Z' }), AS_OF).outcome).toBe('expired');

    expect(evaluateAiLiteracyAssignment(assignment({
      status: 'assigned',
      completedAt: null,
      acknowledgement: false,
      evidence: [],
      dueAt: '2026-07-01T00:00:00.000Z',
    }), AS_OF).outcome).toBe('overdue');
  });

  it('does not accept incomplete waivers', () => {
    expect(evaluateAiLiteracyAssignment(assignment({
      status: 'waived',
      completedAt: null,
      acknowledgement: false,
      evidence: [],
      waiverRationale: 'Not operating AI systems.',
      waiverApprovedBy: null,
      waiverApprovedAt: null,
    }), AS_OF)).toMatchObject({ outcome: 'missing', score: 0 });

    expect(evaluateAiLiteracyAssignment(assignment({
      status: 'waived',
      completedAt: null,
      acknowledgement: false,
      evidence: [],
      waiverRationale: 'Role is outside the documented programme scope.',
      waiverApprovedBy: 'reviewer-1',
      waiverApprovedAt: '2026-06-01T00:00:00.000Z',
    }), AS_OF)).toMatchObject({ outcome: 'waived', score: 100 });
  });

  it('requires acknowledgement, completion timestamp and passing score', () => {
    const result = evaluateAiLiteracyAssignment(assignment({
      completedAt: null,
      acknowledgement: false,
      score: 60,
    }), AS_OF);

    expect(result.outcome).toBe('partial');
    expect(result.score).toBe(25);
    expect(result.reasons).toEqual(expect.arrayContaining([
      'completion_timestamp_missing',
      'acknowledgement_missing',
      'assessment_score_below_threshold',
    ]));
  });

  it('rejects malformed assessment dates instead of silently using them', () => {
    expect(() => evaluateAiLiteracyAssignment(assignment(), 'not-a-date')).toThrow('ai_literacy_assessment_date_invalid');
  });
});

describe('AI literacy coverage', () => {
  it('does not fabricate coverage when no assignments exist', () => {
    expect(calculateAiLiteracyCoverage([], AS_OF)).toMatchObject({ score: null, status: 'not_started' });
  });

  it('reaches 100 only when every required assignment is verified or validly waived', () => {
    const coverage = calculateAiLiteracyCoverage([
      assignment({ id: 'ready-1' }),
      assignment({
        id: 'waived-1',
        status: 'waived',
        completedAt: null,
        acknowledgement: false,
        evidence: [],
        waiverRationale: 'Documented role exception.',
        waiverApprovedBy: 'reviewer-1',
        waiverApprovedAt: '2026-06-01T00:00:00.000Z',
      }),
    ], AS_OF);

    expect(coverage.score).toBe(100);
    expect(coverage.status).toBe('ready');
    expect(coverage.totals.ready).toBe(1);
    expect(coverage.totals.waived).toBe(1);
  });

  it('marks the programme at risk when any required assignment is missing or expired', () => {
    const coverage = calculateAiLiteracyCoverage([
      assignment({ id: 'ready-1' }),
      assignment({ id: 'expired-1', validUntil: '2026-07-01T00:00:00.000Z' }),
    ], AS_OF);

    expect(coverage.score).toBe(50);
    expect(coverage.status).toBe('at_risk');
    expect(coverage.totals.expired).toBe(1);
  });
});
