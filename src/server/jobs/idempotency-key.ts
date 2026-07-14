import { createHash } from 'node:crypto';

type BuildIdempotencyKeyInput = {
  prefix: string;
  identityParts: Array<string | null | undefined>;
  separator?: string;
  digestLength?: number;
};

function normalizeIdentityPart(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function buildIdempotencyKey({
  prefix,
  identityParts,
  separator = ':',
  digestLength = 64,
}: BuildIdempotencyKeyInput) {
  if (!prefix.trim()) throw new Error('Idempotency key prefix is required');
  if (!Number.isSafeInteger(digestLength) || digestLength < 16 || digestLength > 64) {
    throw new Error('Idempotency key digest length must be an integer between 16 and 64');
  }

  const canonicalIdentity = identityParts.map(normalizeIdentityPart).join(separator);
  const digest = createHash('sha256').update(canonicalIdentity).digest('hex').slice(0, digestLength);

  return `${prefix}:${digest}`;
}
