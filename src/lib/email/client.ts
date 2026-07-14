import 'server-only';

import { getStripeWebhookEmailIdempotencyKey } from '@/server/billing/stripe-webhook-email-context';
import {
  redactEmailSecrets,
  sendEmail as sendEmailWithProvider,
  type SendEmailInput,
  type SendEmailResult,
} from './server-sender';

export { redactEmailSecrets };
export type { SendEmailInput, SendEmailResult };

export function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const contextualIdempotencyKey = input.idempotencyKey
    ? undefined
    : getStripeWebhookEmailIdempotencyKey();

  return sendEmailWithProvider({
    ...input,
    ...(contextualIdempotencyKey ? { idempotencyKey: contextualIdempotencyKey } : {}),
  });
}
