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
const MISSING_OBJECT_PATTERNS = Object.freeze([
  ['schema', /\bschema\b[^\n]{0,240}\bdoes not exist\b/],
  ['role', /\brole\b[^\n]{0,240}\bdoes not exist\b/],
  ['relation', /\brelation\b[^\n]{0,240}\bdoes not exist\b/],
  ['table', /\btable\b[^\n]{0,240}\bdoes not exist\b/],
  ['sequence', /\bsequence\b[^\n]{0,240}\bdoes not exist\b/],
  ['function', /\bfunction\b[^\n]{0,240}\bdoes not exist\b/],
  ['type', /\btype\b[^\n]{0,240}\bdoes not exist\b/],
  ['extension', /\bextension\b[^\n]{0,240}\bdoes not exist\b/],
  ['column', /\bcolumn\b[^\n]{0,240}\bdoes not exist\b/],
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
  const value = processOutputText(error);
  for (const [kind, pattern] of MISSING_OBJECT_PATTERNS) {
    if (pattern.test(value)) return kind;
  }
  if (/undefined table/.test(value)) return 'relation';
  if (/undefined object/.test(value)) return 'object';
  return null;
}

export function classifyRecoveryMissingObjectScope(error) {
  const value = processOutputText(error);
  for (const scope of SAFE_DATABASE_SCOPES) {
    const qualified = new RegExp(`(?:^|[^a-z0-9_])${scope.replace(/_/g, '[_]')}\\s*\\.`);
    const schemaMissing = new RegExp(`\\bschema\\s+["']?${scope.replace(/_/g, '[_]')}["']?\\s+does not exist\\b`);
    if (qualified.test(value) || schemaMissing.test(value)) return scope;
  }
  return null;
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

export function buildRecoveryCommandDiagnostic({ error, phase, command }) {
  const commandFamily = SAFE_COMMANDS.has(basename(String(command ?? '')))
    ? basename(String(command))
    : 'unknown';
  const category = classifyRecoveryCommandCategory(error);
  const isolatedRestore = phase === 'isolated_restore' && commandFamily === 'docker';
  const diagnosticMissingObject = isolatedRestore && category === 'database_object_missing';

  return {
    phase: typeof phase === 'string' && phase.length > 0 ? phase : 'unknown',
    commandFamily,
    category,
    exitStatus: Number.isInteger(error?.status) ? error.status : null,
    signal: typeof error?.signal === 'string' && error.signal.length > 0 ? error.signal : null,
    timedOut: error?.code === 'ETIMEDOUT' || error?.killed === true,
    restoreStage: isolatedRestore ? classifyRecoveryRestoreStage(error) : null,
    missingObjectKind: diagnosticMissingObject ? classifyRecoveryMissingObjectKind(error) : null,
    missingObjectScope: diagnosticMissingObject ? classifyRecoveryMissingObjectScope(error) : null,
  };
}
