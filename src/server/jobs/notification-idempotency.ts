import { createHash } from 'node:crypto';

type NotificationIdentity = {
  organizationId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
  occurrence?: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function buildNotificationIdempotencyKey(input: NotificationIdentity) {
  const canonicalIdentity = [
    normalize(input.organizationId),
    normalize(input.eventType),
    normalize(input.entityType),
    normalize(input.entityId),
    normalize(input.recipientEmail),
    normalize(input.occurrence),
  ].join(':');

  const digest = createHash('sha256').update(canonicalIdentity).digest('hex');
  return `notification:${digest}`;
}
