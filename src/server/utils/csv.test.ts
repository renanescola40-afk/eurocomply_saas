import { describe, expect, it } from 'vitest';

import { escapeCsvCell, toCsvRow } from './csv';

describe('csv utils', () => {
  it('escapes commas and quotes', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
  });

  it('serializes rows', () => {
    expect(toCsvRow(['a', 'b'])).toBe('a,b');
    expect(toCsvRow(['a,b', null, undefined])).toBe('"a,b",,');
  });
});
