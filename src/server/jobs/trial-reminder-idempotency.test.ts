import { describe, expect, it } from 'vitest';

import { buildTrialReminderIdempotencyKey } from './trial-reminder-idempotency';

const baseIdentity = {
  organizationId: 'org_123',
  subscriptionId: 'sub_456',
  currentPeriodEnd: '2026-07-20T00:00:00.000Z',
  recipientEmail: 'Owner@Example.com',
};

describe('buildTrialReminderIdempotencyKey', () => {
  it('is deterministic and normalizes case and surrounding whitespace', () => {
    const first = buildTrialReminderIdempotencyKey(baseIdentity);
    const second = buildTrialReminderIdempotencyKey({
      ...baseIdentity,
      organizationId: ' ORG_123 ',
      recipientEmail: ' owner@example.com ',
    });

    expect(second).toBe(first);
    expect(first).toMatch(/^trial-reminder:[a-f0-9]{48}$/);
  });

  it('changes when the subscription delivery identity changes', () => {
    const original = buildTrialReminderIdempotencyKey(baseIdentity);

    expect(buildTrialReminderIdempotencyKey({ ...baseIdentity, subscriptionId: 'sub_789' })).not.toBe(original);
    expect(buildTrialReminderIdempotencyKey({ ...baseIdentity, currentPeriodEnd: '2026-08-20T00:00:00.000Z' })).not.toBe(original);
    expect(buildTrialReminderIdempotencyKey({ ...baseIdentity, recipientEmail: 'other@example.com' })).not.toBe(original);
  });

  it('does not expose customer identifiers or recipient addresses', () => {
    const key = buildTrialReminderIdempotencyKey(baseIdentity);

    expect(key).not.toContain(baseIdentity.organizationId);
    expect(key).not.toContain(baseIdentity.subscriptionId);
    expect(key).not.toContain('owner@example.com');
  });
});
