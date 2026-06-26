import * as Sentry from '@sentry/nextjs';
import { logger, sanitizeContext, sanitizeErrorForLog } from '@/server/observability/logger';

export type ReportErrorContext = Record<string, unknown>;

export { sanitizeContext };

function isSentryConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
}

function getSafeSentryMessage(context: Record<string, unknown>) {
  return context.area === 'observability_smoke' ? 'risck_comply_observability_smoke_test' : 'internal_error';
}

function buildSafeSentryError(error: unknown, context: Record<string, unknown>) {
  const sanitizedError = sanitizeErrorForLog(error);
  const safeError = new Error(getSafeSentryMessage(context));
  safeError.name = sanitizedError.name || 'ApplicationError';

  return { safeError, sanitizedError };
}

export function reportError(error: unknown, context: ReportErrorContext = {}) {
  const sanitizedContext = sanitizeContext(context);
  const { safeError, sanitizedError } = buildSafeSentryError(error, sanitizedContext);
  const report = { error: sanitizedError, context: sanitizedContext };

  if (isSentryConfigured()) {
    Sentry.withScope((scope) => {
      const area = typeof sanitizedContext.area === 'string' ? sanitizedContext.area : 'unknown';
      scope.setTag('app', 'risck-comply');
      scope.setTag('area', area);
      scope.setTag('error_name', sanitizedError.name);
      scope.setContext('safe_context', sanitizedContext);
      scope.setExtra('safe_error', sanitizedError);
      Sentry.captureException(safeError);
    });

    logger.error('application_error_reported', {
      ...sanitizedContext,
      provider: 'sentry',
      error: sanitizedError,
    });

    return report;
  }

  logger.error('application_error', {
    ...sanitizedContext,
    provider: 'local_log',
    error: sanitizedError,
  });

  return report;
}
