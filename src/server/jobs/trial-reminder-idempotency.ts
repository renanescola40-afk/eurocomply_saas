import { buildIdempotencyKey } from './idempotency-key';

const IDEMPOTENCY_KEY_PREFIX = 'trial-reminder';
const IDEMPOTENCY_DIGEST_LENGTH = 48;
const TRIAL_IDENTITY_SEPARATOR = '\u001f';

type TrialReminderIdentity = {
  organizationId: string;
  subscriptionId: string;
  currentPeriodEnd: string;
  recipientEmail: string;
};

export function buildTrialReminderIdempotencyKey(input: TrialReminderIdentity) {
  return buildIdempotencyKey({
    prefix: IDEMPOTENCY_KEY_PREFIX,
    digestLength: IDEMPOTENCY_DIGEST_LENGTH,
    separator: TRIAL_IDENTITY_SEPARATOR,
    identityParts: [
      input.organizationId,
      input.subscriptionId,
      input.currentPeriodEnd,
      input.recipientEmail,
    ],
  });
}
