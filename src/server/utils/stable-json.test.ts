import { describe, expect, it } from 'vitest';

import { stableJsonStringify } from './stable-json';

describe('stableJsonStringify', () => {
  it('sorts object keys', () => {
    expect(stableJsonStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('keeps array order', () => {
    expect(stableJsonStringify([{ b: 1, a: 2 }, { d: 3, c: 4 }])).toBe('[{"a":2,"b":1},{"c":4,"d":3}]');
  });

  it('omits undefined object values', () => {
    expect(stableJsonStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});
