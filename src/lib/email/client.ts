import 'server-only';

import { getEmailIdempotencyContextKey } from './idempotency-context';
import {
  redactEmailSecrets,
  sendEmail as sendServerEmail,
  type SendEmailInput,
  type SendEmailResult,
} from './server-sender';

export { redactEmailSecrets };
export type { SendEmailInput, SendEmailResult };

export function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const contextualKey = getEmailIdempotencyContextKey();

  return sendServerEmail({
    ...input,
    idempotencyKey: input.idempotencyKey ?? contextualKey ?? undefined,
  });
}
