import { basename } from 'node:path';

const SAFE_COMMANDS = new Set(['supabase', 'docker', 'psql', 'pg_dump', 'pg_restore']);

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

  return {
    phase: typeof phase === 'string' && phase.length > 0 ? phase : 'unknown',
    commandFamily,
    category: classifyRecoveryCommandCategory(error),
    exitStatus: Number.isInteger(error?.status) ? error.status : null,
    signal: typeof error?.signal === 'string' && error.signal.length > 0 ? error.signal : null,
    timedOut: error?.code === 'ETIMEDOUT' || error?.killed === true,
  };
}
