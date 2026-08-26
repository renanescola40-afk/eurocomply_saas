import assert from 'node:assert/strict';
import test from 'node:test';

import {
  backupResponseContainsIdentifier,
  projectRefFromApiUrl,
  validateProviderManagedSnapshot,
} from '../../scripts/recovery/verify-supabase-provider-managed-restore.mjs';

const migrations = ['20260822120617', '20260822123538'];

function snapshot(overrides = {}) {
  return {
    organizations: 3,
    organization_members: 8,
    audit_logs: 42,
    auth_users: 9,
    migration_versions: migrations,
    rls_tables: 3,
    policy_count: 12,
    foreign_servers: 0,
    foreign_tables: 0,
    ...overrides,
  };
}

test('derives the production project ref only from a canonical Supabase API URL', () => {
  assert.equal(projectRefFromApiUrl('https://tganhbbhfxcpblmgqprg.supabase.co'), 'tganhbbhfxcpblmgqprg');
  assert.throws(() => projectRefFromApiUrl('https://example.com'), /not_canonical/);
});

test('finds the selected backup identifier without depending on provider response nesting', () => {
  const payload = { backups: [{ id: 'daily:2026-08-26', status: 'COMPLETED' }] };
  assert.equal(backupResponseContainsIdentifier(payload, 'daily:2026-08-26'), true);
  assert.equal(backupResponseContainsIdentifier(payload, 'other'), false);
});

test('accepts aggregate-only provider restore evidence with identical migration history and RLS', () => {
  const result = validateProviderManagedSnapshot({ source: snapshot(), restore: snapshot() });
  assert.equal(result.sourceCounts.organizations, 3);
  assert.equal(result.restoredAuthUsers, 9);
  assert.deepEqual(result.restoreVersions, migrations);
});

test('fails closed when provider restore migration history differs', () => {
  assert.throws(
    () => validateProviderManagedSnapshot({ source: snapshot(), restore: snapshot({ migration_versions: ['20260822120617'] }) }),
    /migration_history_mismatch/,
  );
});

test('fails closed when RLS or policy coverage is incomplete', () => {
  assert.throws(() => validateProviderManagedSnapshot({ source: snapshot(), restore: snapshot({ rls_tables: 2 }) }), /rls_incomplete/);
  assert.throws(() => validateProviderManagedSnapshot({ source: snapshot(), restore: snapshot({ policy_count: 2 }) }), /policies_incomplete/);
});

test('fails closed if the restored project has external database bindings', () => {
  assert.throws(() => validateProviderManagedSnapshot({ source: snapshot(), restore: snapshot({ foreign_servers: 1 }) }), /external_binding_present/);
  assert.throws(() => validateProviderManagedSnapshot({ source: snapshot(), restore: snapshot({ foreign_tables: 1 }) }), /external_binding_present/);
});
