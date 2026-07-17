import * as Sentry from '@sentry/nextjs';

export const REDACTED_VALUE = '[redacted]';

export const STANDARD_SECURITY_EVENTS = [
  'security_denied',
  'rbac_denied',
  'origin_denied',
  'rate_limit_blocked',
  'rate_limit_abuse_detected',
  'rate_limit_backend_unavailable',
  'step_up_failed',
  'webhook_failed',
  'upload_blocked',
  'rls_validation_failed',
  'audit_chain_invalid',
] as const;

export type StandardSecurityEvent = (typeof STANDARD_SECURITY_EVENTS)[number];
export type LogLevel = 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;
export type SanitizedLogValue = string | number | boolean | null | SanitizedLogValue[] | { [key: string]: SanitizedLogValue };
export type SecurityAlertSeverity = 'none' | 'high' | 'critical';

const SECURITY_ALERT_POLICY: Record<StandardSecurityEvent, SecurityAlertSeverity> = {
  security_denied: 'none',
  rbac_denied: 'none',
  origin_denied: 'none',
  rate_limit_blocked: 'none',
  rate_limit_abuse_detected: 'high',
  rate_limit_backend_unavailable: 'high',
  step_up_failed: 'high',
  webhook_failed: 'high',
  upload_blocked: 'high',
  rls_validation_failed: 'critical',
  audit_chain_invalid: 'critical',
};

const SENSITIVE_KEY_PATTERN = /(password|passwd|secret|token|access_token|refresh_token|id_token|authorization|bearer|cookie|set-cookie|session|api[_-]?key|x[_-]?api[_-]?key|client[_-]?secret|private[_-]?key|connection[_-]?string|database[_-]?url|dsn|service[_-]?role|supabase|stripe_signature|stripe[_-]?secret|webhook[_-]?secret|card|iban|ssn|email|phone|address|jwt)/i;
const ORGANIZATION_ID_PATTERN = /^(org_[A-Za-z0-9_-]{3,64}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/;
const MAX_STRING_LENGTH = 160;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_KEYS = 40;

const SENSITIVE_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /Basic\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /sk_(live|test)_[A-Za-z0-9_]{8,}/g,
  /rk_(live|test)_[A-Za-z0-9_]{8,}/g,
  /pk_(live|test)_[A-Za-z0-9_]{8,}/g,
  /whsec_[A-Za-z0-9_]{8,}/g,
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /sbp_[A-Za-z0-9_]{20,}/g,
  /sb_secret_[A-Za-z0-9_]{20,}/g,
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /https:\/\/[^\s@]+@[^\s/]+\/[^\s]+/gi,
  /(session|csrf|token|authorization|cookie|secret|api[_-]?key)=([^;\s]+)/gi,
];

function truncateString(value: string) {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
}

function redactString(value: string) {
  let redacted = value;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, REDACTED_VALUE);
  }
  return truncateString(redacted);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isSafeOrganizationId(value: unknown): value is string {
  return typeof value === 'string' && ORGANIZATION_ID_PATTERN.test(value);
}

export function sanitizeRequestId(value: unknown): string {
  if (typeof value !== 'string') return 'req_unavailable';
  return REQUEST_ID_PATTERN.test(value) ? value : 'req_invalid';
}

export function requestIdFromHeaders(headers: Headers): string {
  return sanitizeRequestId(
    headers.get('x-request-id')
      ?? headers.get('x-correlation-id')
      ?? headers.get('cf-ray')
      ?? headers.get('x-vercel-id')
      ?? undefined,
  );
}

export function sanitizeErrorForLog(error: unknown): { name: string; code: string; message: 'internal_error' } {
  if (error instanceof Error) {
    return {
      name: truncateString(error.name || 'Error'),
      code: truncateString(error.name || 'Error'),
      message: 'internal_error',
    };
  }

  return {
    name: 'UnknownError',
    code: 'unknown',
    message: 'internal_error',
  };
}

function sanitizeValue(value: unknown, depth = 0): SanitizedLogValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Error) return sanitizeErrorForLog(value);
  if (depth >= 4) return '[truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1));
  }

  if (isPlainRecord(value)) {
    return sanitizeContext(value, depth + 1);
  }

  return truncateString(String(value));
}

export function sanitizeContext(context: LogContext = {}, depth = 0): Record<string, SanitizedLogValue> {
  return Object.fromEntries(
    Object.entries(context)
      .slice(0, MAX_OBJECT_KEYS)
      .map(([key, value]) => {
        if (key === 'organizationId') {
          return [key, isSafeOrganizationId(value) ? value : REDACTED_VALUE];
        }

        if (key === 'requestId') {
          return [key, sanitizeRequestId(value)];
        }

        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, sanitizeValue(value, depth)];
      }),
  );
}

export function sanitizeLog<TContext extends LogContext>(context: TContext) {
  return sanitizeContext(context);
}

function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  const sanitized = sanitizeContext(context);
  const payload = {
    level,
    event: truncateString(event),
    requestId: sanitizeRequestId(sanitized.requestId),
    ...(sanitized.organizationId ? { organizationId: sanitized.organizationId } : {}),
    timestamp: new Date().toISOString(),
    context: sanitized,
  };

  const line = JSON.stringify(sanitizeLog(payload));

  if (level === 'error') {
    console.error(line);
    return payload;
  }

  if (level === 'warn') {
    console.warn(line);
    return payload;
  }

  console.info(line);
  return payload;
}

function isSentryConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
}

function runtimeEnvironment() {
  return process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || 'unknown';
}

function runtimeRelease() {
  return process.env.SENTRY_RELEASE?.trim()
    || process.env.VERCEL_GIT_COMMIT_SHA?.trim()
    || process.env.RELEASE_COMMIT_SHA?.trim()
    || 'unknown';
}

export function securityAlertSeverity(event: StandardSecurityEvent): SecurityAlertSeverity {
  return SECURITY_ALERT_POLICY[event];
}

function routeSecurityAlert(event: StandardSecurityEvent, context: LogContext) {
  const severity = securityAlertSeverity(event);
  if (severity === 'none' || !isSentryConfigured()) return false;

  const sanitized = sanitizeContext(context);
  Sentry.withScope((scope) => {
    scope.setLevel(severity === 'critical' ? 'fatal' : 'error');
    scope.setTag('app', 'risck-comply');
    scope.setTag('security_event', event);
    scope.setTag('alert_severity', severity);
    scope.setTag('environment', runtimeEnvironment());
    scope.setTag('release', runtimeRelease());
    scope.setFingerprint(['security-alert', event]);
    scope.setContext('safe_context', sanitized);
    Sentry.captureMessage(`security_alert:${event}`);
  });

  return true;
}

export const logger = {
  info(event: string, context?: LogContext) {
    return writeLog('info', event, context);
  },
  warn(event: string, context?: LogContext) {
    return writeLog('warn', event, context);
  },
  error(event: string, context?: LogContext) {
    return writeLog('error', event, context);
  },
};

export function logSecurityEvent(event: StandardSecurityEvent, context: LogContext = {}, level: LogLevel = 'warn') {
  const severity = securityAlertSeverity(event);
  const alertRouted = routeSecurityAlert(event, context);
  return writeLog(level, event, {
    ...context,
    alertSeverity: severity,
    alertProvider: alertRouted ? 'sentry' : 'local_log',
    alertRouted,
  });
}
