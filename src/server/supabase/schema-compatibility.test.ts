import { describe, expect, it } from 'vitest';

import {
  isExpectedMissingSupabaseMaintenanceSchema,
  isExpectedMissingSupabaseRelation,
  isExpectedMissingSupabaseSchema,
} from './schema-compatibility';

describe('Supabase schema compatibility classification', () => {
  it.each(['42P01', 'PGRST205'])(
    'recognizes %s as an expected missing-relation signal',
    (code) => {
      expect(isExpectedMissingSupabaseRelation({ code })).toBe(true);
      expect(isExpectedMissingSupabaseSchema({ code })).toBe(true);
      expect(isExpectedMissingSupabaseMaintenanceSchema({ code })).toBe(true);
    },
  );

  it.each(['42703', 'PGRST204'])(
    'accepts %s only for the governed maintenance column rollout',
    (code) => {
      expect(isExpectedMissingSupabaseRelation({ code })).toBe(false);
      expect(isExpectedMissingSupabaseSchema({ code })).toBe(false);
      expect(isExpectedMissingSupabaseMaintenanceSchema({ code })).toBe(true);
    },
  );

  it('does not downgrade unknown database/provider failures', () => {
    for (const error of [
      { code: '42501' },
      { code: 'PGRST301' },
      new Error('network failure'),
      null,
    ]) {
      expect(isExpectedMissingSupabaseRelation(error)).toBe(false);
      expect(isExpectedMissingSupabaseSchema(error)).toBe(false);
      expect(isExpectedMissingSupabaseMaintenanceSchema(error)).toBe(false);
    }
  });
});
