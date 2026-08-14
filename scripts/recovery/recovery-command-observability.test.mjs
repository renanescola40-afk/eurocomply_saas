import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRecoveryCommandDiagnostic,
  classifyRecoveryCommandCategory,
  classifyRecoveryRestoreInput,
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

test('classifies only allowlisted restore input filenames from process output', () => {
  assert.equal(classifyRecoveryRestoreInput(errorWith('psql:/tmp/production-roles.sql:4: ERROR: role does not exist')), 'roles');
  assert.equal(classifyRecoveryRestoreInput(errorWith('psql:/tmp/production-schema.sql:9: ERROR: relation does not exist')), 'schema');
  assert.equal(classifyRecoveryRestoreInput(errorWith('psql:/tmp/production-data.sql:12: ERROR: relation does not exist')), 'data');
  assert.equal(classifyRecoveryRestoreInput(errorWith('psql:/tmp/customer-private-name.sql:12: ERROR: relation secret_table does not exist')), null);
});

test('ignores command arguments echoed in Error.message when selecting the failing restore input', () => {
  const error = errorWith(
    'psql:/tmp/production-data.sql:12: ERROR: relation tenant_secret does not exist',
    {
      message: 'docker exec psql --file /tmp/production-roles.sql --file /tmp/production-schema.sql --file /tmp/production-data.sql failed',
    },
  );
  assert.equal(classifyRecoveryRestoreInput(error), 'data');
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
    restoreInput: null,
    exitStatus: 1,
    signal: null,
    timedOut: false,
  });
  for (const forbidden of ['stderr', 'stdout', 'message', 'args', 'url', 'sql', 'objectName']) {
    assert.equal(forbidden in diagnostic, false);
  }
});

test('emits the safe restore input without leaking raw SQL or object names', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith('psql:/tmp/production-data.sql:42: ERROR: relation customer_secret_table does not exist'),
    phase: 'isolated_restore',
    command: 'docker',
  });

  assert.equal(diagnostic.category, 'database_object_missing');
  assert.equal(diagnostic.restoreInput, 'data');
  const serialized = JSON.stringify(diagnostic);
  assert.equal(serialized.includes('customer_secret_table'), false);
  assert.equal(serialized.includes('production-data.sql'), false);
  assert.equal(serialized.includes('psql:'), false);
});

test('does not expose unknown executable names', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith('command failed'),
    phase: 'unknown_phase',
    command: '/tmp/private-tool-name',
  });
  assert.equal(diagnostic.commandFamily, 'unknown');
  assert.equal(diagnostic.category, 'command_failed');
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
