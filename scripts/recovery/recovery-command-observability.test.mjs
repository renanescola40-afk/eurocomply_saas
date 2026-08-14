import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRecoveryCommandDiagnostic,
  classifyRecoveryCommandCategory,
  classifyRecoveryMissingObjectKind,
  classifyRecoveryMissingObjectScope,
  classifyRecoveryRestoreStage,
} from './recovery-command-observability.mjs';

function errorWith(stderr, overrides = {}) {
  return {
    stderr: Buffer.from(stderr),
    stdout: Buffer.from('internal output'),
    message: 'command failed',
    status: 1,
    ...overrides,
  };
}

test('classifies common connectivity failures', () => {
  assert.equal(classifyRecoveryCommandCategory(errorWith('authentication failed')), 'authentication_failed');
  assert.equal(classifyRecoveryCommandCategory(errorWith('could not translate host name')), 'dns_resolution_failed');
  assert.equal(classifyRecoveryCommandCategory(errorWith('connection refused')), 'connection_refused');
  assert.equal(classifyRecoveryCommandCategory(errorWith('timeout expired')), 'connection_timeout');
});

test('classifies compatibility and permission failures', () => {
  assert.equal(classifyRecoveryCommandCategory(errorWith('server version 17 pg_dump version 16 aborting because of server version mismatch')), 'client_server_version_mismatch');
  assert.equal(classifyRecoveryCommandCategory(errorWith('unknown flag')), 'unsupported_command_option');
  assert.equal(classifyRecoveryCommandCategory(errorWith('permission denied')), 'permission_denied');
});

test('emits only allowlisted redacted diagnostic fields', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith('authentication failed'),
    phase: 'roles_dump',
    command: '/usr/local/bin/supabase',
  });

  assert.deepEqual(diagnostic, {
    phase: 'roles_dump',
    commandFamily: 'supabase',
    category: 'authentication_failed',
    exitStatus: 1,
    signal: null,
    timedOut: false,
    restoreStage: null,
    missingObjectKind: null,
    missingObjectScope: null,
  });
  for (const forbidden of ['stderr', 'stdout', 'message', 'args', 'url']) {
    assert.equal(forbidden in diagnostic, false);
  }
});

test('derives the latest allowlisted restore stage from process output only', () => {
  const error = errorWith('ERROR: relation "private_customer_123" does not exist', {
    stdout: Buffer.from('RISCK_RECOVERY_STAGE_ROLES\nRISCK_RECOVERY_STAGE_SCHEMA\n'),
    message: 'docker command contains RISCK_RECOVERY_STAGE_DATA but must not influence classification',
    status: 3,
  });
  assert.equal(classifyRecoveryRestoreStage(error), 'schema');
  assert.equal(classifyRecoveryMissingObjectKind(error), 'relation');
  assert.equal(classifyRecoveryMissingObjectScope(error), null);

  const diagnostic = buildRecoveryCommandDiagnostic({
    error,
    phase: 'isolated_restore',
    command: 'docker',
  });
  assert.equal(diagnostic.restoreStage, 'schema');
  assert.equal(diagnostic.missingObjectKind, 'relation');
  assert.equal(diagnostic.missingObjectScope, null);
  assert.equal(diagnostic.category, 'database_object_missing');
  assert.equal(diagnostic.exitStatus, 3);
  assert.equal(JSON.stringify(diagnostic).includes('private_customer_123'), false);
  assert.equal(JSON.stringify(diagnostic).includes('RISCK_RECOVERY_STAGE_'), false);
});

test('classifies the terminal missing-object payload instead of psql location or earlier notices', () => {
  const error = errorWith([
    'NOTICE: schema "storage" does not exist, skipping',
    'NOTICE: relation "public.old_table" does not exist, skipping',
    'psql:/tmp/production-schema.sql:420: ERROR: relation "auth.private_identity_123" does not exist',
  ].join('\n'), {
    stdout: Buffer.from('RISCK_RECOVERY_STAGE_ROLES\nRISCK_RECOVERY_STAGE_SCHEMA\n'),
    status: 3,
  });

  assert.equal(classifyRecoveryMissingObjectKind(error), 'relation');
  assert.equal(classifyRecoveryMissingObjectScope(error), 'auth');
  const diagnostic = buildRecoveryCommandDiagnostic({ error, phase: 'isolated_restore', command: 'docker' });
  assert.equal(diagnostic.category, 'database_object_missing');
  assert.equal(diagnostic.restoreStage, 'schema');
  assert.equal(diagnostic.missingObjectKind, 'relation');
  assert.equal(diagnostic.missingObjectScope, null);
  const serialized = JSON.stringify(diagnostic);
  assert.equal(serialized.includes('production-schema.sql'), false);
  assert.equal(serialized.includes('private_identity_123'), false);
  assert.equal(serialized.includes('old_table'), false);
  assert.equal(serialized.includes('auth'), false);
});

test('derives the metadata gate from the terminal error rather than earlier restore-conflict text', () => {
  const error = errorWith([
    'NOTICE: extension "extensions" already exists, skipping',
    'psql:/tmp/production-schema.sql:421: ERROR: relation "auth.private_identity_123" does not exist',
  ].join('\n'), {
    stdout: Buffer.from('RISCK_RECOVERY_STAGE_ROLES\nRISCK_RECOVERY_STAGE_SCHEMA\n'),
    status: 3,
  });

  assert.equal(classifyRecoveryCommandCategory(error), 'restore_conflict');
  const diagnostic = buildRecoveryCommandDiagnostic({ error, phase: 'isolated_restore', command: 'docker' });
  assert.equal(diagnostic.category, 'database_object_missing');
  assert.equal(diagnostic.missingObjectKind, 'relation');
  assert.equal(diagnostic.missingObjectScope, null);
  assert.equal(JSON.stringify(diagnostic).includes('private_identity_123'), false);
  assert.equal(JSON.stringify(diagnostic).includes('auth'), false);
});

test('ignores NOTICE-only missing-object messages when there is no terminal ERROR or FATAL line', () => {
  const error = errorWith([
    'NOTICE: schema "auth" does not exist, skipping',
    'NOTICE: relation "auth.private_identity_123" does not exist, skipping',
  ].join('\n'), {
    stdout: Buffer.from('RISCK_RECOVERY_STAGE_ROLES\nRISCK_RECOVERY_STAGE_SCHEMA\n'),
    killed: true,
    code: 'ETIMEDOUT',
    status: null,
  });

  assert.equal(classifyRecoveryMissingObjectKind(error), null);
  assert.equal(classifyRecoveryMissingObjectScope(error), null);
  const diagnostic = buildRecoveryCommandDiagnostic({ error, phase: 'isolated_restore', command: 'docker' });
  assert.equal(diagnostic.category, 'command_timeout');
  assert.equal(diagnostic.missingObjectKind, null);
  assert.equal(diagnostic.missingObjectScope, null);
  assert.equal(JSON.stringify(diagnostic).includes('private_identity_123'), false);
});

test('can classify an allowlisted scope internally without persisting any SQL scope in evidence', () => {
  const safe = errorWith('ERROR: relation "auth.private_identity_123" does not exist');
  assert.equal(classifyRecoveryMissingObjectScope(safe), 'auth');
  const safeDiagnostic = buildRecoveryCommandDiagnostic({ error: safe, phase: 'isolated_restore', command: 'docker' });
  assert.equal(safeDiagnostic.missingObjectScope, null);
  assert.equal(JSON.stringify(safeDiagnostic).includes('auth'), false);
  assert.equal(JSON.stringify(safeDiagnostic).includes('private_identity_123'), false);

  const unknown = errorWith('ERROR: relation "customer_secret.private_table" does not exist');
  assert.equal(classifyRecoveryMissingObjectScope(unknown), null);
  const unknownDiagnostic = buildRecoveryCommandDiagnostic({ error: unknown, phase: 'isolated_restore', command: 'docker' });
  assert.equal(unknownDiagnostic.missingObjectScope, null);
  assert.equal(JSON.stringify(unknownDiagnostic).includes('customer_secret'), false);
  assert.equal(JSON.stringify(unknownDiagnostic).includes('private_table'), false);
});

test('does not retain missing object metadata outside isolated restore', () => {
  const error = errorWith('ERROR: relation "auth.private_identity_123" does not exist');
  const diagnostic = buildRecoveryCommandDiagnostic({ error, phase: 'schema_dump', command: 'supabase' });
  assert.equal(diagnostic.category, 'database_object_missing');
  assert.equal(diagnostic.restoreStage, null);
  assert.equal(diagnostic.missingObjectKind, null);
  assert.equal(diagnostic.missingObjectScope, null);
  assert.equal(JSON.stringify(diagnostic).includes('private_identity_123'), false);
});

test('classifies missing object kinds without retaining identifiers', () => {
  const cases = [
    ['schema', 'ERROR: schema "tenant_secret" does not exist'],
    ['role', 'ERROR: role "tenant_owner" does not exist'],
    ['relation', 'ERROR: relation "private_table" does not exist'],
    ['function', 'ERROR: function private_fn(uuid) does not exist'],
    ['type', 'ERROR: type "private_enum" does not exist'],
    ['sequence', 'ERROR: sequence "private_seq" does not exist'],
    ['extension', 'ERROR: extension "private_ext" does not exist'],
    ['column', 'ERROR: column "private_col" does not exist'],
  ];
  for (const [expected, stderr] of cases) {
    const error = errorWith(stderr);
    assert.equal(classifyRecoveryMissingObjectKind(error), expected);
    const diagnostic = buildRecoveryCommandDiagnostic({ error, phase: 'isolated_restore', command: 'docker' });
    assert.equal(diagnostic.missingObjectKind, expected);
    assert.equal(diagnostic.missingObjectScope, null);
    assert.equal(JSON.stringify(diagnostic).includes('private_'), false);
  }
});

test('does not trust restore marker text embedded only in an exec error message', () => {
  const error = errorWith('ERROR: undefined object', {
    stdout: Buffer.from('no restore marker emitted'),
    message: 'docker args RISCK_RECOVERY_STAGE_DATA auth.private_table secret-url-like-text',
  });
  assert.equal(classifyRecoveryRestoreStage(error), null);
  assert.equal(classifyRecoveryMissingObjectScope(error), null);
  const diagnostic = buildRecoveryCommandDiagnostic({ error, phase: 'isolated_restore', command: 'docker' });
  assert.equal(diagnostic.restoreStage, null);
  assert.equal(diagnostic.missingObjectKind, 'object');
  assert.equal(diagnostic.missingObjectScope, null);
});

test('does not expose unknown executable names', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith('command failed'),
    phase: 'unknown_phase',
    command: '/tmp/private-tool-name',
  });
  assert.equal(diagnostic.commandFamily, 'unknown');
  assert.equal(diagnostic.category, 'command_failed');
  assert.equal(diagnostic.restoreStage, null);
  assert.equal(diagnostic.missingObjectKind, null);
  assert.equal(diagnostic.missingObjectScope, null);
});

test('records timeout state without raw process output', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith('timed out', { code: 'ETIMEDOUT', killed: true, status: null }),
    phase: 'schema_dump',
    command: 'supabase',
  });
  assert.equal(diagnostic.timedOut, true);
  assert.equal(diagnostic.category, 'connection_timeout');
  assert.equal('stderr' in diagnostic, false);
  assert.equal('stdout' in diagnostic, false);
});
