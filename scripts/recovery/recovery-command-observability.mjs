import { basename } from 'node:path';

const SAFE_COMMANDS = new Set(['supabase', 'docker', 'psql', 'pg_dump', 'pg_restore']);
const SAFE_DATABASE_SCOPES = Object.freeze([
  'auth',
  'storage',
  'public',
  'extensions',
  'realtime',
  'vault',
  'cron',
  'net',
  'pgmq',
  'graphql',
  'graphql_public',
  'supabase_functions',
  'app_private',
]);
const RESTORE_STAGE_MARKERS = Object.freeze({
  risck_recovery_stage_roles: 'roles',
  risck_recovery_stage_schema: 'schema',
  risck_recovery_stage_data: 'data',
});
const MISSING_OBJECT_PREFIXES = Object.freeze([
  ['schema', /^schema\b/],
  ['role', /^role\b/],
  ['relation', /^relation\b/],
  ['table', /^table\b/],
  ['sequence', /^sequence\b/],
  ['function', /^function\b/],
  ['type', /^type\b/],
  ['extension', /^extension\b/],
  ['column', /^column\b/],
]);

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

function processOutputText(error) {
  return [error?.stderr, error?.stdout]
    .map(text)
    .join('\n')
    .toLowerCase();
}

function terminalDatabaseErrorPayload(error) {
  const lines = processOutputText(error)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const match = lines[index].match(/\b(?:error|fatal):\s*(.*)$/);
    if (match) return match[1].trim();
  }
  return '';
}

function classifyRecoveryCategoryFromText(value) {
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
  if (/command not found/.test(value)) return 'command_unavailable';
  return 'command_failed';
}

export function classifyRecoveryRestoreStage(error) {
  const value = processOutputText(error);
  let latestStage = null;
  let latestIndex = -1;
  for (const [marker, stage] of Object.entries(RESTORE_STAGE_MARKERS)) {
    const index = value.lastIndexOf(marker);
    if (index > latestIndex) {
      latestIndex = index;
      latestStage = stage;
    }
  }
  return latestIndex >= 0 ? latestStage : null;
}

export function classifyRecoveryMissingObjectKind(error) {
  const value = terminalDatabaseErrorPayload(error);
  if (!value) return null;
  for (const [kind, pattern] of MISSING_OBJECT_PREFIXES) {
    if (pattern.test(value)) return kind;
  }
  if (/^undefined table\b/.test(value)) return 'relation';
  if (/^undefined object\b/.test(value)) return 'object';
  return null;
}

export function classifyRecoveryMissingObjectScope(error) {
  const value = terminalDatabaseErrorPayload(error);
  if (!value) return null;
  for (const scope of SAFE_DATABASE_SCOPES) {
    const qualified = new RegExp(`(?:^|[^a-z0-9_])${scope.replace(/_/g, '[_]')}\\s*\\.`);
    const schemaMissing = new RegExp(`\\bschema\\s+["']?${scope.replace(/_/g, '[_]')}["']?\\s+does not exist\\b`);
    if (qualified.test(value) || schemaMissing.test(value)) return scope;
  }
  return null;
}

export function classifyRecoveryCommandCategory(error) {
  if (error?.code === 'ETIMEDOUT' || error?.killed === true) return 'command_timeout';
  if (error?.code === 'ENOENT') return 'command_unavailable';
  return classifyRecoveryCategoryFromText(combinedErrorText(error));
}

export function buildRecoveryCommandDiagnostic({ error, phase, command }) {
  const commandFamily = SAFE_COMMANDS.has(basename(String(command ?? '')))
    ? basename(String(command))
    : 'unknown';
  const isolatedRestore = phase === 'isolated_restore' && commandFamily === 'docker';
  const terminalPayload = isolatedRestore ? terminalDatabaseErrorPayload(error) : '';
  const genericCategory = classifyRecoveryCommandCategory(error);
  const category = terminalPayload
    ? classifyRecoveryCategoryFromText(terminalPayload)
    : genericCategory;
  const diagnosticMissingObject = isolatedRestore
    && Boolean(terminalPayload)
    && category === 'database_object_missing';

  return {
    phase: typeof phase === 'string' && phase.length > 0 ? phase : 'unknown',
    commandFamily,
    category,
    exitStatus: Number.isInteger(error?.status) ? error.status : null,
    signal: typeof error?.signal === 'string' && error.signal.length > 0 ? error.signal : null,
    timedOut: error?.code === 'ETIMEDOUT' || error?.killed === true,
    restoreStage: isolatedRestore ? classifyRecoveryRestoreStage(error) : null,
    missingObjectKind: diagnosticMissingObject ? classifyRecoveryMissingObjectKind(error) : null,
    missingObjectScope: null,
  };
}
