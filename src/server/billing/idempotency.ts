import { createHash } from 'node:crypto';

export const BILLING_IDEMPOTENCY_HEADER = 'Idempotency-Key';
export const BILLING_IDEMPOTENCY_MIN_LENGTH = 8;
export const BILLING_IDEMPOTENCY_MAX_LENGTH = 128;

const BILLING_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

export type BillingIdempotencyScope = 'checkout' | 'portal' | 'subscription';

export type BillingIdempotencyContext = {
  digest: string;
  stripeKey: string;
};

export type BillingIdempotencyResult =
  | { ok: true; context: BillingIdempotencyContext }
  | { ok: false; error: 'idempotency_key_required' | 'invalid_idempotency_key' };

function hashBillingIdempotencyKey(input: {
  scope: BillingIdempotencyScope;
  organizationId: string;
  userId: string;
  clientKey: string;
}) {
  return createHash('sha256')
    .update(input.scope)
    .update('\0')
    .update(input.organizationId)
    .update('\0')
    .update(input.userId)
    .update('\0')
    .update(input.clientKey)
    .digest('hex');
}

export function parseBillingIdempotencyKey(input: {
  clientKey: string | null | undefined;
  scope: BillingIdempotencyScope;
  organizationId: string;
  userId: string;
}): BillingIdempotencyResult {
  const clientKey = input.clientKey?.trim();

  if (!clientKey) {
    return { ok: false, error: 'idempotency_key_required' };
  }

  if (
    clientKey.length < BILLING_IDEMPOTENCY_MIN_LENGTH ||
    clientKey.length > BILLING_IDEMPOTENCY_MAX_LENGTH ||
    !BILLING_IDEMPOTENCY_KEY_PATTERN.test(clientKey)
  ) {
    return { ok: false, error: 'invalid_idempotency_key' };
  }

  const digest = hashBillingIdempotencyKey({
    scope: input.scope,
    organizationId: input.organizationId,
    userId: input.userId,
    clientKey,
  });

  return {
    ok: true,
    context: {
      digest,
      stripeKey: `risck:${input.scope}:${digest}`,
    },
  };
}

export function readBillingIdempotencyKey(
  request: Request,
  input: {
    scope: BillingIdempotencyScope;
    organizationId: string;
    userId: string;
  },
): BillingIdempotencyResult {
  return parseBillingIdempotencyKey({
    ...input,
    clientKey: request.headers.get(BILLING_IDEMPOTENCY_HEADER),
  });
}

export function deriveStripeIdempotencyKey(context: BillingIdempotencyContext, operation: string) {
  const normalizedOperation = operation.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 48);
  return `${context.stripeKey}:${normalizedOperation || 'operation'}`;
}
