import { describe, expect, it } from 'vitest';
import { buildPromotionManifest, evaluateCampaignCloseout, reminderStageFor, shouldDeliverReminder } from './qualified-review-delivery';

const base = { assignmentId: 'a', campaignId: 'c', organizationId: 'o', reviewerEmail: 'reviewer@example.com', dueAt: '2026-07-30T00:00:00.000Z', validUntil: null, status: 'in_review', lastReminderStage: null } as const;

describe('qualified review delivery', () => {
  it('selects reminder stages deterministically', () => {
    expect(reminderStageFor(base, new Date('2026-07-16T00:00:00.000Z'))).toBe('due_14d');
    expect(reminderStageFor(base, new Date('2026-07-23T00:00:00.000Z'))).toBe('due_7d');
    expect(reminderStageFor(base, new Date('2026-07-29T00:00:00.000Z'))).toBe('due_1d');
    expect(reminderStageFor(base, new Date('2026-07-31T00:00:00.000Z'))).toBe('overdue');
  });

  it('deduplicates an already delivered stage', () => {
    expect(shouldDeliverReminder({ ...base, lastReminderStage: 'due_7d' }, new Date('2026-07-23T00:00:00.000Z'))).toEqual({ stage: 'due_7d', deliver: false });
  });

  it('fails closeout when one workstream is missing or expired', () => {
    const result = evaluateCampaignCloseout({ targetSha: 'a'.repeat(40), expectedWorkstreams: ['A','B'], assignments: [{ workstreamId: 'A', status: 'accepted', weight: 25, validUntil: '2027-01-01T00:00:00.000Z' }], now: new Date('2026-07-25T00:00:00.000Z') });
    expect(result.ready).toBe(false);
    expect(result.failures).toContain('B: assignment missing');
  });

  it('builds a strict 51-point exact-SHA manifest', () => {
    const manifest = buildPromotionManifest({ campaignId: 'campaign', targetSha: 'b'.repeat(40), completedWeight: 51, evidenceDigests: Array.from({ length: 8 }, (_, index) => index.toString(16).padStart(64, '0')) });
    expect(manifest.completedWeight).toBe(51);
    expect(manifest.evidenceDigests).toHaveLength(8);
  });

  it('rejects promotion below 51 points', () => {
    expect(() => buildPromotionManifest({ campaignId: 'campaign', targetSha: 'b'.repeat(40), completedWeight: 50, evidenceDigests: Array(8).fill('c'.repeat(64)) })).toThrow('incomplete');
  });
});
