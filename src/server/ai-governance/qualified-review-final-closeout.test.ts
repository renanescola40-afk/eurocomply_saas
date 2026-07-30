import { describe, expect, it } from 'vitest';
import { evaluateQualifiedReviewFinalCloseout, QUALIFIED_REVIEW_TECHNICAL_SCOPE } from './qualified-review-final-closeout';

const controls = Object.fromEntries(QUALIFIED_REVIEW_TECHNICAL_SCOPE.map((key) => [key, true]));

describe('qualified review final closeout', () => {
  it('closes technical scope while keeping human execution pending', () => {
    const result = evaluateQualifiedReviewFinalCloseout({
      campaignId: '00000000-0000-4000-8000-000000000001',
      targetSha: 'a'.repeat(40),
      acceptedReviewCount: 0,
      acceptedPoints: 0,
      evidencePackageDigest: null,
      technicalControls: controls,
    });
    expect(result.technicalComplete).toBe(true);
    expect(result.operationalComplete).toBe(false);
    expect(result.conversationStatus).toBe('TECHNICAL_SCOPE_COMPLETE');
    expect(result.humanStatus).toBe('HUMAN_EXECUTION_PENDING');
    expect(result.humanBlockers).toContain('accepted_review_count:0/8');
  });

  it('requires every technical control before closing the conversation scope', () => {
    const result = evaluateQualifiedReviewFinalCloseout({
      campaignId: '00000000-0000-4000-8000-000000000001',
      targetSha: 'b'.repeat(40),
      acceptedReviewCount: 8,
      acceptedPoints: 51,
      evidencePackageDigest: 'c'.repeat(64),
      technicalControls: { ...controls, reminders: false },
    });
    expect(result.technicalComplete).toBe(false);
    expect(result.technicalBlockers).toEqual(['technical_control_missing:reminders']);
  });

  it('marks operational completion only with genuine complete review evidence', () => {
    const result = evaluateQualifiedReviewFinalCloseout({
      campaignId: '00000000-0000-4000-8000-000000000001',
      targetSha: 'd'.repeat(40),
      acceptedReviewCount: 8,
      acceptedPoints: 51,
      evidencePackageDigest: 'e'.repeat(64),
      technicalControls: controls,
    });
    expect(result.operationalComplete).toBe(true);
    expect(result.humanStatus).toBe('HUMAN_EXECUTION_COMPLETE');
    expect(result.closeoutDigest).toMatch(/^[a-f0-9]{64}$/);
  });
});
