import { describe, expect, it } from 'vitest';

import { stableSha256 } from './stable-hash';

describe('stableSha256', () => {
  it('returns the same hash for objects with different key order', () => {
    expect(stableSha256({ b: 1, a: 2 })).toBe(stableSha256({ a: 2, b: 1 }));
  });

  it('returns different hashes for different values', () => {
    expect(stableSha256({ a: 1 })).not.toBe(stableSha256({ a: 2 }));
  });
});
