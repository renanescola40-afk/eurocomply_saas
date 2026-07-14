import { describe, expect, it } from 'vitest';

import { buildIdempotencyKey } from './idempotency-key';

describe('buildIdempotencyKey', () => {
  it('canonicalizes identity parts and applies the requested format', () => {
    expect(
      buildIdempotencyKey({
        prefix: 'example',
        digestLength: 32,
        separator: '\u001f',
        identityParts: [' ORG_123 ', 'Owner@Example.com'],
      }),
    ).toMatch(/^example:[a-f0-9]{32}$/);
  });

  it('rejects invalid configuration instead of producing ambiguous keys', () => {
    expect(() => buildIdempotencyKey({ prefix: ' ', identityParts: ['a'] })).toThrow(
      'Idempotency key prefix is required',
    );
    expect(() =>
      buildIdempotencyKey({ prefix: 'example', identityParts: ['a'], digestLength: 8 }),
    ).toThrow('Idempotency key digest length must be an integer between 16 and 64');
  });
});
