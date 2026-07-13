import { createHash } from 'node:crypto';

const IDEMPOTENCY_KEY_PREFIX = 'trial-reminder';
const IDEMPOTENCY_DIGEST_LENGTH = 48;

type TrialReminderIdentity = {
  organizationId: string;
  subscriptionId: string;
  currentPeriodEnd: string;
  recipientEmail: string;
};

function normalizeIdentityPart(value: string) {
  return value.trim().toLowerCase();
}

export function buildTrialReminderIdempotencyKey(input: TrialReminderIdentity) {
  const canonicalIdentity = [
    normalizeIdentityPart(input.organizationId),
    normalizeIdentityPart(input.subscriptionId),
    normalizeIdentityPart(input.currentPeriodEnd),
    normalizeIdentityPart(input.recipientEmail),
  ].join('\u001f');

  const digest = createHash('sha256').update(canonicalIdentity).digest('hex').slice(0, IDEMPOTENCY_DIGEST_LENGTH);
  return `${IDEMPOTENCY_KEY_PREFIX}:${digest}`;
}
