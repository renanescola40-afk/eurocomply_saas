import { buildIdempotencyKey } from './idempotency-key';

type NotificationIdentity = {
  organizationId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
  occurrence?: string | null;
};

export function buildNotificationIdempotencyKey(input: NotificationIdentity) {
  return buildIdempotencyKey({
    prefix: 'notification',
    identityParts: [
      input.organizationId,
      input.eventType,
      input.entityType,
      input.entityId,
      input.recipientEmail,
      input.occurrence,
    ],
  });
}
