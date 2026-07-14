import { describe, expect, it } from 'vitest';

import { buildNotificationIdempotencyKey } from './notification-idempotency';

const base = {
  organizationId: 'ORG-123',
  eventType: 'document.expiring',
  entityType: 'document',
  entityId: 'DOC-456',
  recipientEmail: 'Owner@Example.com',
  occurrence: '2026-09-01',
};

describe('buildNotificationIdempotencyKey', () => {
  it('is deterministic and canonicalizes case and whitespace', () => {
    expect(buildNotificationIdempotencyKey(base)).toBe(
      buildNotificationIdempotencyKey({
        ...base,
        organizationId: ' org-123 ',
        recipientEmail: ' owner@example.com ',
      }),
    );
  });

  it('changes when the logical occurrence changes', () => {
    expect(buildNotificationIdempotencyKey(base)).not.toBe(
      buildNotificationIdempotencyKey({ ...base, occurrence: '2026-10-01' }),
    );
  });

  it('does not expose customer identifiers or recipient PII', () => {
    const key = buildNotificationIdempotencyKey(base);

    expect(key).toMatch(/^notification:[a-f0-9]{64}$/);
    expect(key).not.toContain('org-123');
    expect(key).not.toContain('doc-456');
    expect(key).not.toContain('owner@example.com');
  });
});
