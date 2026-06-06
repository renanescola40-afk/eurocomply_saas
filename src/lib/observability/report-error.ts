import * as Sentry from '@sentry/nextjs';

type ReportErrorContext = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(password|secret|token|authorization|cookie|session|supabase|stripe_signature|card|email|phone|address)/i;

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (value.length > 160) return `${value.slice(0, 160)}…`;
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => sanitizeValue(item));
  }

  if (typeof value === 'object') {
    return sanitizeContext(value as ReportErrorContext);
  }

  return String(value);
}

export function sanitizeContext(context: ReportErrorContext = {}) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeValue(value),
    ]),
  );
}

export function reportError(error: unknown, context: ReportErrorContext = {}) {
  const sanitizedContext = sanitizeContext(context);

  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: sanitizedContext,
    });
    return;
  }

  console.error('[EuroComply]', error, sanitizedContext);
}
