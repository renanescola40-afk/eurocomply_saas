import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRecoveryCommandDiagnostic,
  classifyRecoveryCommandCategory,
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
  });
  for (const forbidden of ['stderr', 'stdout', 'message', 'args', 'url']) {
    assert.equal(forbidden in diagnostic, false);
  }
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

test('retains only an allowlisted restore file and safe missing relation identifier', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith(
      'psql:/tmp/production-schema.sql:812: ERROR: relation "public.enterprise_contracts" does not exist\nDETAIL: internal-only text',
      { message: 'Command failed: docker exec ... postgresql://user:secret@example.invalid/db' },
    ),
    phase: 'isolated_restore',
    command: 'docker',
  });

  assert.deepEqual(diagnostic, {
    phase: 'isolated_restore',
    commandFamily: 'docker',
    category: 'database_object_missing',
    exitStatus: 1,
    signal: null,
    timedOut: false,
    sourceFile: 'production-schema.sql',
    databaseObjectKind: 'relation',
    databaseObjectIdentifier: 'public.enterprise_contracts',
  });
  const serialized = JSON.stringify(diagnostic);
  assert.equal(serialized.includes('internal-only text'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(serialized.includes('postgresql://'), false);
});

test('retains a safe missing function name without argument text', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith(
      'psql:/tmp/production-schema.sql:44: ERROR: function extensions.digest(text, text) does not exist',
    ),
    phase: 'isolated_restore',
    command: 'docker',
  });

  assert.equal(diagnostic.databaseObjectKind, 'function');
  assert.equal(diagnostic.databaseObjectIdentifier, 'extensions.digest');
  assert.equal('functionArguments' in diagnostic, false);
});

test('drops unsafe or unrecognized missing-object text instead of persisting it', () => {
  const diagnostic = buildRecoveryCommandDiagnostic({
    error: errorWith(
      'psql:/tmp/customer-export.sql:9: ERROR: relation "public.safe;select_secret" does not exist',
    ),
    phase: 'isolated_restore',
    command: 'docker',
  });

  assert.equal(diagnostic.category, 'database_object_missing');
  assert.equal('sourceFile' in diagnostic, false);
  assert.equal('databaseObjectIdentifier' in diagnostic, false);
  assert.equal('databaseObjectKind' in diagnostic, false);
});
