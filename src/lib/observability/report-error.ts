import * as Sentry from '@sentry/nextjs';
import { logger, sanitizeContext, sanitizeErrorForLog } from '@/server/observability/logger';

export type ReportErrorContext = Record<string, unknown>;

export { sanitizeContext };

export function reportError(error: unknown, context: ReportErrorContext = {}) {
  const sanitizedContext = sanitizeContext(context);
  const sanitizedError = sanitizeErrorForLog(error);
  const report = { error: sanitizedError, context: sanitizedContext };

  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: sanitizedContext,
    });
    return report;
  }

  logger.error('application_error', {
    ...sanitizedContext,
    error: sanitizedError,
  });

  return report;
}
