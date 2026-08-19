import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extensionParitySatisfied,
  planExtensionParity,
} from './recovery-extension-parity.mjs';

const source = [
  { name: 'plpgsql', schema: 'pg_catalog', version: '1.0' },
  { name: 'source_only', schema: 'extensions', version: '2.0' },
];

const targetBase = [
  { name: 'plpgsql', schema: 'pg_catalog', version: '1.0' },
  { name: 'target_managed', schema: 'extensions', version: '1.5' },
];

const available = [
  { name: 'source_only', version: '2.0', relocatable: true, schema: null },
];

test('plans the missing source extension without treating target-only extensions as source requirements', () => {
  const plan = planExtensionParity(source, targetBase, available);

  assert.equal(plan.enable.length, 1);
  assert.equal(plan.enable[0].name, 'source_only');
  assert.equal(plan.unavailableVersions.length, 0);
  assert.equal(plan.schemaMismatches.length, 0);
  assert.equal(plan.versionMismatches.length, 0);
});

test('accepts exact source parity when a pinned restore target retains provider-managed extras', () => {
  const finalTarget = [
    ...targetBase,
    { name: 'source_only', schema: 'extensions', version: '2.0' },
  ];

  assert.equal(extensionParitySatisfied(source, finalTarget), true);
});

test('rejects a missing source extension even when target extras exist', () => {
  assert.equal(extensionParitySatisfied(source, targetBase), false);
});

test('rejects a source extension schema mismatch', () => {
  const finalTarget = [
    { name: 'plpgsql', schema: 'pg_catalog', version: '1.0' },
    { name: 'source_only', schema: 'public', version: '2.0' },
    { name: 'target_managed', schema: 'extensions', version: '1.5' },
  ];

  assert.equal(extensionParitySatisfied(source, finalTarget), false);
});

test('rejects a source extension version mismatch', () => {
  const finalTarget = [
    { name: 'plpgsql', schema: 'pg_catalog', version: '1.0' },
    { name: 'source_only', schema: 'extensions', version: '2.1' },
    { name: 'target_managed', schema: 'extensions', version: '1.5' },
  ];

  assert.equal(extensionParitySatisfied(source, finalTarget), false);
});
