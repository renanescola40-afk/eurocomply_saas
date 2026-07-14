import { AsyncLocalStorage } from 'node:async_hooks';

import { buildIdempotencyKey } from '@/server/jobs/idempotency-key';

type StripeWebhookEmailContext = {
  eventId: string;
  eventType: string;
};

const stripeWebhookEmailContext = new AsyncLocalStorage<StripeWebhookEmailContext>();

export function withStripeWebhookEmailContext<T>(
  context: StripeWebhookEmailContext,
  operation: () => Promise<T>,
) {
  if (!context.eventId.trim() || !context.eventType.trim()) {
    throw new Error('Stripe webhook email context requires an event ID and event type');
  }

  return stripeWebhookEmailContext.run(context, operation);
}

export function getStripeWebhookEmailIdempotencyKey() {
  const context = stripeWebhookEmailContext.getStore();
  if (!context) return undefined;

  return buildIdempotencyKey({
    prefix: 'stripe-webhook-email-v1',
    identityParts: [context.eventId, context.eventType],
  });
}
