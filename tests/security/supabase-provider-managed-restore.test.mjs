import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  backupResponseContainsIdentifier,
  findSelectedBackup,
  normalizeSqlForManagementApi,
  projectRefFromApiUrl,
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

test('matches backup identifiers only against backup id fields', () => {
  const payload = {
    region: 'eu-west-1',
    backups: [
      {
        id: 4242,
        is_physical_backup: true,
        status: 'COMPLETED',
        inserted_at: '2026-08-27T04:45:08.731+00:00',
      },
    ],
  };
  assert.equal(backupResponseContainsIdentifier(payload, '4242'), true);
  assert.equal(backupResponseContainsIdentifier(payload, 'eu-west-1'), false);
  assert.equal(backupResponseContainsIdentifier(payload, 'COMPLETED'), false);
});

test('resolves the selected physical backup by real id plus observed creation time', () => {
  const payload = {
    backups: [
      {
        id: 4242,
        is_physical_backup: true,
        status: 'COMPLETED',
        inserted_at: '2026-08-27T04:45:08.731+00:00',
      },
    ],
  };
  const selected = findSelectedBackup(payload, '4242', '2026-08-27T04:45:08Z');
  assert.equal(selected?.id, 4242);
});

test('accepts the dashboard timestamp identifier when it uniquely identifies the same completed physical backup second', () => {
  const payload = {
    backups: [
      {
        id: 4242,
        is_physical_backup: true,
        status: 'COMPLETED',
        inserted_at: '2026-08-27T04:45:08.731+00:00',
      },
    ],
  };
  const selected = findSelectedBackup(payload, '2026-08-27T04:45:08Z', '2026-08-27T04:45:08Z');
  assert.equal(selected?.id, 4242);
});

test('resolves a timestamp-only completed physical backup record without an opaque provider id', () => {
  const payload = {
    backups: [
      {
        is_physical_backup: true,
        status: 'COMPLETED',
        inserted_at: '2026-08-27T04:45:08.731+00:00',
      },
    ],
  };

  const selected = findSelectedBackup(payload, '2026-08-27T04:45:08Z', '2026-08-27T04:45:08Z');
  assert.equal(selected?.inserted_at, '2026-08-27T04:45:08.731+00:00');
});

test('fails closed when timestamp-only backup provenance is ambiguous or unusable', () => {
  const completedPhysical = {
    is_physical_backup: true,
    status: 'COMPLETED',
    inserted_at: '2026-08-27T04:45:08.731+00:00',
  };
  const selector = '2026-08-27T04:45:08Z';

  assert.equal(
    findSelectedBackup(
      { backups: [completedPhysical, { ...completedPhysical, inserted_at: '2026-08-27T04:45:08.999+00:00' }] },
      selector,
      selector,
    ),
    null,
  );
  assert.equal(findSelectedBackup({ backups: [{ ...completedPhysical, status: 'FAILED' }] }, selector, selector), null);
  assert.equal(
    findSelectedBackup({ backups: [{ ...completedPhysical, is_physical_backup: false }] }, selector, selector),
    null,
  );
});

test('fails closed on ambiguous, non-physical, failed, or unrelated backup provenance', () => {
  const base = {
    id: 4242,
    is_physical_backup: true,
    status: 'COMPLETED',
    inserted_at: '2026-08-27T04:45:08.731+00:00',
  };

  assert.equal(
    findSelectedBackup({ backups: [base, { ...base, id: 4243 }] }, '2026-08-27T04:45:08Z', '2026-08-27T04:45:08Z'),
    null,
  );
  assert.equal(
    findSelectedBackup({ backups: [{ ...base, is_physical_backup: false }] }, '4242', '2026-08-27T04:45:08Z'),
    null,
  );
  assert.equal(
    findSelectedBackup({ backups: [{ ...base, status: 'FAILED' }] }, '4242', '2026-08-27T04:45:08Z'),
    null,
  );
  assert.equal(findSelectedBackup({ backups: [base] }, 'eu-west-1', '2026-08-27T04:45:08Z'), null);
  assert.equal(findSelectedBackup({ backups: [base] }, '4242', '2026-08-26T04:45:08Z'), null);
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
