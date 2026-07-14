import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendServerEmail: vi.fn(async (input) => ({
    sent: true,
    provider: 'resend' as const,
    status: 'sent' as const,
    attempts: 1,
    id: input.idempotencyKey,
  })),
}));

vi.mock('./server-sender', () => ({
  redactEmailSecrets: (value: string) => value,
  sendEmail: mocks.sendServerEmail,
}));

import { runWithEmailIdempotencyContext } from './idempotency-context';
import { sendEmail } from './client';

const baseEmail = {
  to: 'billing@example.test',
  subject: 'Payment issue',
  html: '<p>Payment issue</p>',
  text: 'Payment issue',
} as const;

describe('email client idempotency context', () => {
  it('applies the contextual key when the caller does not provide one', async () => {
    const result = await runWithEmailIdempotencyContext('stripe-payment-failed-email:test', () =>
      sendEmail(baseEmail),
    );

    expect(result.id).toBe('stripe-payment-failed-email:test');
    expect(mocks.sendServerEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'stripe-payment-failed-email:test' }),
    );
  });

  it('preserves an explicit caller idempotency key', async () => {
    await runWithEmailIdempotencyContext('context-key', () =>
      sendEmail({ ...baseEmail, idempotencyKey: 'explicit-key' }),
    );

    expect(mocks.sendServerEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({ idempotencyKey: 'explicit-key' }),
    );
  });

  it('does not invent a key outside a context', async () => {
    await sendEmail(baseEmail);

    expect(mocks.sendServerEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({ idempotencyKey: undefined }),
    );
  });
});
