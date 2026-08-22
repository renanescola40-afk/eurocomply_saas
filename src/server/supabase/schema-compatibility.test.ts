import { describe, expect, it } from 'vitest';

import { isExpectedMissingSupabaseSchema } from './schema-compatibility';

describe('Supabase schema compatibility classification', () => {
  it.each(['42P01', '42703', 'PGRST204', 'PGRST205'])(
    'recognizes %s as an expected missing-schema signal',
    (code) => {
      expect(isExpectedMissingSupabaseSchema({ code })).toBe(true);
    },
  );

  it('does not downgrade unknown database/provider failures', () => {
    expect(isExpectedMissingSupabaseSchema({ code: '42501' })).toBe(false);
    expect(isExpectedMissingSupabaseSchema({ code: 'PGRST301' })).toBe(false);
    expect(isExpectedMissingSupabaseSchema(new Error('network failure'))).toBe(false);
    expect(isExpectedMissingSupabaseSchema(null)).toBe(false);
  });
});
