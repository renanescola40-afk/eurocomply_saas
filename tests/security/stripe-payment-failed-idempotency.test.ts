import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const emailClientSource = readFileSync(
  new URL('../../src/lib/email/client.ts', import.meta.url),
  'utf8',
);
const recoverySource = readFileSync(
  new URL('../../src/server/billing/stripe-webhook-recovery.ts', import.meta.url),
  'utf8',
);
const webhookSource = readFileSync(
  new URL('../../src/server/billing/stripe-webhooks.ts', import.meta.url),
  'utf8',
);

describe('Stripe payment-failed email replay safety', () => {
  it('keeps invoice.payment_failed in the recoverable processing-lease set', () => {
    const recoverableSet = recoverySource.match(
      /const RECOVERABLE_STRIPE_EVENT_TYPES = new Set\(\[[\s\S]*?\]\);/,
    )?.[0];

    expect(recoverableSet).toBeDefined();
    expect(recoverableSet).toContain("'invoice.payment_failed'");
  });

  it('processes both initial and recovered attempts inside the same email context', () => {
    expect(recoverySource).toContain('function processStripeWebhookEventWithEmailContext');
    expect(recoverySource).toContain('withStripeWebhookEmailContext(');
    expect(recoverySource.match(/processStripeWebhookEventWithEmailContext\(event\)/g)).toHaveLength(2);
  });

  it('injects contextual idempotency only when a caller did not supply a key', () => {
    expect(emailClientSource).toContain('input.idempotencyKey');
    expect(emailClientSource).toContain('getStripeWebhookEmailIdempotencyKey()');
    expect(emailClientSource).toContain('...(contextualIdempotencyKey ? { idempotencyKey: contextualIdempotencyKey } : {})');
  });

  it('keeps payment-failed delivery inside the verified webhook handler', () => {
    const paymentFailedBranch = webhookSource.match(
      /if \(event\.type === 'invoice\.payment_failed'\) \{[\s\S]*?\n\s*\}/,
    )?.[0];

    expect(paymentFailedBranch).toBeDefined();
    expect(paymentFailedBranch).toContain('sendPaymentFailedEmail');
    expect(webhookSource.indexOf("event.type === 'invoice.payment_failed'")).toBeLessThan(
      webhookSource.indexOf('await markStripeEventProcessed(event)'),
    );
  });
});
