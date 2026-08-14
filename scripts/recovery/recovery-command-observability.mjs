import { basename } from 'node:path';

const SAFE_COMMANDS = new Set(['supabase', 'docker', 'psql', 'pg_dump', 'pg_restore']);
const SAFE_RESTORE_FILES = new Set([
  'production-roles.sql',
  'production-schema.sql',
  'production-data.sql',
]);
const SAFE_OBJECT_KINDS = new Set([
  'relation',
  'table',
  'schema',
  'type',
  'function',
  'sequence',
  'extension',
  'role',
]);
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)?$/;

function text(value) {
  if (value == null) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

function combinedErrorText(error) {
  return [error?.stderr, error?.stdout, error?.message]
    .map(text)
    .join('\n')
    .toLowerCase();
}

function processOutput(error) {
  return [error?.stderr, error?.stdout]
    .map(text)
    .join('\n');
}

export function classifyRecoveryCommandCategory(error) {
  const value = combinedErrorText(error);

  if (/password authentication failed|authentication failed|no password supplied|sasl authentication failed/.test(value)) {
    return 'authentication_failed';
  }
  if (/could not translate host name|getaddrinfo|name or service not known|temporary failure in name resolution/.test(value)) {
    return 'dns_resolution_failed';
  }
  if (/connection refused|econnrefused/.test(value)) return 'connection_refused';
  if (/timeout expired|timed out|etimedout/.test(value)) return 'connection_timeout';
  if (/server version.*pg_dump version|aborting because of server version mismatch/.test(value)) {
    return 'client_server_version_mismatch';
  }
  if (/unknown flag|unknown option|unrecognized option|flag provided but not defined/.test(value)) {
    return 'unsupported_command_option';
  }
  if (/permission denied|must be owner|insufficient privilege|not enough privilege/.test(value)) {
    return 'permission_denied';
  }
  if (/pgbouncer|prepared statement .* already exists|transaction pool/.test(value)) {
    return 'pooler_or_proxy_incompatible';
  }
  if (/certificate|tls handshake|ssl error|ssl syscall/.test(value)) return 'tls_connection_error';
  if (/duplicate key|violates unique constraint|already exists/.test(value)) return 'restore_conflict';
  if (/does not exist|undefined table|undefined object/.test(value)) return 'database_object_missing';
  if (error?.code === 'ENOENT' || /command not found/.test(value)) return 'command_unavailable';
  if (error?.code === 'ETIMEDOUT' || error?.killed === true) return 'command_timeout';
  return 'command_failed';
}

function extractRestoreSourceFile(error) {
  const value = processOutput(error);
  const match = value.match(/psql:\/tmp\/(production-(?:roles|schema|data)\.sql):\d+:/i);
  if (!match) return null;
  const filename = match[1].toLowerCase();
  return SAFE_RESTORE_FILES.has(filename) ? filename : null;
}

function normalizeDatabaseIdentifier(value) {
  const normalized = String(value ?? '').trim();
  return SAFE_IDENTIFIER.test(normalized) ? normalized : null;
}

function extractMissingDatabaseObject(error) {
  const value = processOutput(error);

  const quoted = value.match(
    /\b(relation|table|schema|type|sequence|extension|role)\s+"([A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)?)"\s+does not exist/i,
  );
  if (quoted) {
    const kind = quoted[1].toLowerCase();
    const identifier = normalizeDatabaseIdentifier(quoted[2]);
    if (SAFE_OBJECT_KINDS.has(kind) && identifier) return { kind, identifier };
  }

  const functionMatch = value.match(
    /\bfunction\s+([A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)?)\s*\([^\r\n]*?\)\s+does not exist/i,
  );
  if (functionMatch) {
    const identifier = normalizeDatabaseIdentifier(functionMatch[1]);
    if (identifier) return { kind: 'function', identifier };
  }

  return null;
}

export function buildRecoveryCommandDiagnostic({ error, phase, command }) {
  const commandFamily = SAFE_COMMANDS.has(basename(String(command ?? '')))
    ? basename(String(command))
    : 'unknown';
  const category = classifyRecoveryCommandCategory(error);
  const sourceFile = category === 'database_object_missing' ? extractRestoreSourceFile(error) : null;
  const missingObject = category === 'database_object_missing' ? extractMissingDatabaseObject(error) : null;

  return {
    phase: typeof phase === 'string' && phase.length > 0 ? phase : 'unknown',
    commandFamily,
    category,
    exitStatus: Number.isInteger(error?.status) ? error.status : null,
    signal: typeof error?.signal === 'string' && error.signal.length > 0 ? error.signal : null,
    timedOut: error?.code === 'ETIMEDOUT' || error?.killed === true,
    ...(sourceFile ? { sourceFile } : {}),
    ...(missingObject ? {
      databaseObjectKind: missingObject.kind,
      databaseObjectIdentifier: missingObject.identifier,
    } : {}),
  };
}
