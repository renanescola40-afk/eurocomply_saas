import { describe, expect, it } from 'vitest';

import {
  extensionParitySatisfied,
  planExtensionParity,
  quotePgIdentifier,
  quotePgLiteral,
} from '../../scripts/recovery/recovery-extension-parity.mjs';

describe('isolated recovery extension parity', () => {
  it('enables only the exact source extension version missing from the disposable target', () => {
    const plan = planExtensionParity(
      [
        { name: 'pgcrypto', schema: 'extensions', version: '1.3' },
        { name: 'uuid-ossp', schema: 'extensions', version: '1.1' },
        { name: 'wrappers', schema: 'extensions', version: '0.6.1' },
      ],
      [
        { name: 'pgcrypto', schema: 'extensions', version: '1.3' },
        { name: 'uuid-ossp', schema: 'extensions', version: '1.1' },
      ],
      [
        { name: 'wrappers', version: '0.5.0', relocatable: true, schema: null },
        { name: 'wrappers', version: '0.6.1', relocatable: true, schema: null },
      ],
    );

    expect(plan.unavailableVersions).toEqual([]);
    expect(plan.schemaMismatches).toEqual([]);
    expect(plan.versionMismatches).toEqual([]);
    expect(plan.enable).toHaveLength(1);
    expect(plan.enable[0]).toMatchObject({ name: 'wrappers', version: '0.6.1' });
    expect(plan.enable[0]?.sql).toContain('create schema if not exists "extensions";');
    expect(plan.enable[0]?.sql).toContain(
      'create extension if not exists "wrappers" with schema "extensions" version \'0.6.1\';',
    );
  });

  it('fails closed when the production extension version is unavailable on the disposable target', () => {
    const plan = planExtensionParity(
      [{ name: 'source_only_extension', schema: 'extensions', version: '2.0' }],
      [],
      [{ name: 'source_only_extension', version: '1.0', relocatable: true, schema: null }],
    );

    expect(plan.enable).toEqual([]);
    expect(plan.unavailableVersions).toEqual([
      { name: 'source_only_extension', version: '2.0' },
    ]);
  });

  it('fails closed when an already-installed target extension has a different version', () => {
    const plan = planExtensionParity(
      [{ name: 'wrappers', schema: 'extensions', version: '0.6.1' }],
      [{ name: 'wrappers', schema: 'extensions', version: '0.5.0' }],
      [{ name: 'wrappers', version: '0.6.1', relocatable: true, schema: null }],
    );

    expect(plan.enable).toEqual([]);
    expect(plan.versionMismatches).toEqual([
      {
        name: 'wrappers',
        expectedVersion: '0.6.1',
        observedVersion: '0.5.0',
      },
    ]);
  });

  it('fails closed when a non-relocatable extension cannot preserve its source schema', () => {
    const plan = planExtensionParity(
      [{ name: 'fixed_extension', schema: 'expected_schema', version: '1.0' }],
      [],
      [{ name: 'fixed_extension', version: '1.0', relocatable: false, schema: 'fixed_schema' }],
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

  it('requires exact bidirectional extension name schema and version parity after target preparation', () => {
    const source = [
      { name: 'pgcrypto', schema: 'extensions', version: '1.3' },
      { name: 'supabase_vault', schema: 'vault', version: '0.3.1' },
    ];
    expect(extensionParitySatisfied(source, source)).toBe(true);
    expect(extensionParitySatisfied(source, [
      { name: 'pgcrypto', schema: 'public', version: '1.3' },
      { name: 'supabase_vault', schema: 'vault', version: '0.3.1' },
    ])).toBe(false);
    expect(extensionParitySatisfied(source, [
      { name: 'pgcrypto', schema: 'extensions', version: '1.2' },
      { name: 'supabase_vault', schema: 'vault', version: '0.3.1' },
    ])).toBe(false);
    expect(extensionParitySatisfied(source, [
      ...source,
      { name: 'target_only_extension', schema: 'extensions', version: '1.0' },
    ])).toBe(false);
    expect(extensionParitySatisfied([
      ...source,
      { name: 'source_only_extension', schema: 'extensions', version: '1.0' },
    ], source)).toBe(false);
  });

  it('quotes identifiers and extension versions without raw SQL concatenation', () => {
    expect(quotePgIdentifier('uuid-ossp')).toBe('"uuid-ossp"');
    expect(quotePgIdentifier('schema"name')).toBe('"schema""name"');
    expect(quotePgLiteral("1.0'rc1")).toBe("'1.0''rc1'");
    expect(() => quotePgIdentifier('bad\u0000name')).toThrow('postgres_identifier_invalid');
    expect(() => quotePgLiteral('bad\nversion')).toThrow('postgres_literal_invalid');
  });
});
