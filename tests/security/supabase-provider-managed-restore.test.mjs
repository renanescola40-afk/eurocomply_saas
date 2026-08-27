import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  backupResponseContainsIdentifier,
  normalizeSqlForManagementApi,
  projectRefFromApiUrl,
  resolveProviderBackupSelection,
  validateProviderManagedSnapshot,
} from '../../scripts/recovery/verify-supabase-provider-managed-restore.mjs';
import { allowedDestroyConfirmations } from '../../scripts/recovery/destroy-supabase-provider-managed-restore.mjs';

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

test('keeps exact backup identifier selection backward compatible', () => {
  const payload = { backups: [{ id: 'daily:2026-08-27', inserted_at: '2026-08-27T04:45:08Z', status: 'COMPLETED' }] };
  assert.deepEqual(
    resolveProviderBackupSelection(payload, 'daily:2026-08-27', '2026-08-27T04:45:08Z'),
    { mode: 'identifier' },
  );
  assert.equal(resolveProviderBackupSelection(payload, 'missing', '2026-08-27T04:45:08Z'), null);
});

test('resolves one provider backup from the exact created-at second when requested', () => {
  const payload = {
    data: {
      backups: [
        { id: 'daily:2026-08-27', inserted_at: '2026-08-27T04:45:08.321Z', status: 'COMPLETED' },
        { id: 'daily:2026-08-26', inserted_at: '2026-08-26T04:46:49Z', status: 'COMPLETED' },
      ],
    },
  };
  assert.deepEqual(
    resolveProviderBackupSelection(payload, 'AUTO_FROM_CREATED_AT', '2026-08-27T04:45:08Z'),
    { mode: 'created_at' },
  );
});

test('fails closed when created-at backup resolution is missing or ambiguous', () => {
  const uniquePayload = {
    backups: [{ id: 'daily:2026-08-27', inserted_at: '2026-08-27T04:45:08Z', status: 'COMPLETED' }],
  };
  assert.equal(resolveProviderBackupSelection(uniquePayload, 'AUTO_FROM_CREATED_AT', '2026-08-25T04:45:08Z'), null);

  const ambiguousPayload = {
    backups: [
      { id: 'one', inserted_at: '2026-08-27T04:45:08.100Z', status: 'COMPLETED' },
      { id: 'two', inserted_at: '2026-08-27T04:45:08.900Z', status: 'COMPLETED' },
    ],
  };
  assert.throws(
    () => resolveProviderBackupSelection(ambiguousPayload, 'AUTO_FROM_CREATED_AT', '2026-08-27T04:45:08Z'),
    /created_at_ambiguous/,
  );
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

test('normalizes only the reviewed psql directives for approved validators', () => {
  assert.equal(
    normalizeSqlForManagementApi('\\set ON_ERROR_STOP on\nselect 1;\n'),
    'select 1;\n',
  );
  assert.equal(
    normalizeSqlForManagementApi(
      'select 1;\n\\ir validate-gap-remediation-runtime.sql\n',
      'scripts/security/validate-live-rls-inventory-helper-boundary.sql',
    ),
    'select 1;\n',
  );
});

test('rejects unreviewed includes and all other psql meta commands', () => {
  assert.throws(
    () => normalizeSqlForManagementApi('\\ir arbitrary.sql\nselect 1;\n', 'scripts/security/validate-live-rls-inventory-helper-boundary.sql'),
    /include_not_allowed/,
  );
  assert.throws(() => normalizeSqlForManagementApi('\\copy public.users to stdout\n'), /meta_command_not_allowed/);
});

test('accepts only the two bounded restore teardown confirmation contexts', () => {
  const restoreRef = 'abcdefghijklmnopqrst';
  assert.deepEqual(allowedDestroyConfirmations(restoreRef), [
    `DELETE ${restoreRef} AFTER REHEARSAL`,
    `DELETE ${restoreRef} AFTER RECOVERY PROOF`,
  ]);
  assert.deepEqual(allowedDestroyConfirmations('production'), []);
});

test('keeps both provider restore teardown workflows aligned with the teardown guard', async () => {
  const [rehearsalWorkflow, recoveryWorkflow] = await Promise.all([
    readFile(new URL('../../.github/workflows/supabase-forward-reconciliation-rehearsal.yml', import.meta.url), 'utf8'),
    readFile(new URL('../../.github/workflows/recovery-resilience-proof.yml', import.meta.url), 'utf8'),
  ]);

  assert.match(rehearsalWorkflow, /DELETE \$\{RECOVERY_PROVIDER_RESTORE_PROJECT_REF\} AFTER REHEARSAL/);
  assert.match(recoveryWorkflow, /DELETE \$\{RECOVERY_PROVIDER_RESTORE_PROJECT_REF\} AFTER RECOVERY PROOF/);
});
