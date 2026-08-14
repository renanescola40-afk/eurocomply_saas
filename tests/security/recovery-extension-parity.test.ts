import { describe, expect, it } from 'vitest';

import {
  extensionParitySatisfied,
  planExtensionParity,
  quotePgIdentifier,
} from '../../scripts/recovery/recovery-extension-parity.mjs';

describe('isolated recovery extension parity', () => {
  it('enables only source extensions missing from the disposable target', () => {
    const plan = planExtensionParity(
      [
        { name: 'pgcrypto', schema: 'extensions' },
        { name: 'uuid-ossp', schema: 'extensions' },
        { name: 'wrappers', schema: 'extensions' },
      ],
      [
        { name: 'pgcrypto', schema: 'extensions' },
        { name: 'uuid-ossp', schema: 'extensions' },
      ],
      [{ name: 'wrappers', relocatable: true, schema: null }],
    );

    expect(plan.unavailable).toEqual([]);
    expect(plan.schemaMismatches).toEqual([]);
    expect(plan.enable).toHaveLength(1);
    expect(plan.enable[0]?.name).toBe('wrappers');
    expect(plan.enable[0]?.sql).toContain('create schema if not exists "extensions";');
    expect(plan.enable[0]?.sql).toContain('create extension if not exists "wrappers" with schema "extensions";');
  });

  it('fails closed when a production extension is unavailable on the disposable target', () => {
    const plan = planExtensionParity(
      [{ name: 'source_only_extension', schema: 'extensions' }],
      [],
      [{ name: 'pgcrypto', relocatable: true, schema: null }],
    );

    expect(plan.enable).toEqual([]);
    expect(plan.unavailable).toEqual(['source_only_extension']);
  });

  it('fails closed when a non-relocatable extension cannot preserve its source schema', () => {
    const plan = planExtensionParity(
      [{ name: 'fixed_extension', schema: 'expected_schema' }],
      [],
      [{ name: 'fixed_extension', relocatable: false, schema: 'fixed_schema' }],
    );

    expect(plan.enable).toEqual([]);
    expect(plan.schemaMismatches).toEqual([
      {
        name: 'fixed_extension',
        expectedSchema: 'expected_schema',
        observedSchema: 'fixed_schema',
      },
    ]);
  });

  it('requires exact extension schema parity after target preparation', () => {
    const source = [
      { name: 'pgcrypto', schema: 'extensions' },
      { name: 'supabase_vault', schema: 'vault' },
    ];
    expect(extensionParitySatisfied(source, source)).toBe(true);
    expect(extensionParitySatisfied(source, [
      { name: 'pgcrypto', schema: 'public' },
      { name: 'supabase_vault', schema: 'vault' },
    ])).toBe(false);
  });

  it('quotes extension and schema identifiers instead of concatenating raw SQL identifiers', () => {
    expect(quotePgIdentifier('uuid-ossp')).toBe('"uuid-ossp"');
    expect(quotePgIdentifier('schema"name')).toBe('"schema""name"');
    expect(() => quotePgIdentifier('bad\u0000name')).toThrow('postgres_identifier_invalid');
  });
});
