import { ApiSecurityError } from '@/server/security/api-guards';

/**
 * Expected unauthenticated requests are already recorded as safe security
 * denials by secureApiError. They are not application failures and must not
 * emit Sentry error events. All other failures remain observable.
 */
export function shouldReportRetentionExportError(error: unknown): boolean {
  return !(error instanceof ApiSecurityError
    && error.code === 'unauthorized'
    && error.status === 401);
}
