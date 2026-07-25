import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { runQualifiedReviewReminderJob } from '@/server/jobs/qualified-review-reminders';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
const ROUTE = '/api/internal/qualified-review-reminders';

export async function POST(request: Request) {
  const rateLimit = await enforceInternalAuthenticationRateLimit(request, { route: ROUTE, action: 'authenticate_qualified_review_reminders' });
  if (rateLimit) return rateLimit;
  if (!isAuthorizedInternalCronRequest(request)) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runQualifiedReviewReminderJob();
    if (result.failed > 0) return noStoreJson({ error: 'qualified_review_reminders_partially_failed', ...result }, { status: 500 });
    return noStoreJson({ ok: true, ...result });
  } catch (error) {
    reportError(error, { area: 'qualified_review_reminder_job' });
    return noStoreJson({ error: 'qualified_review_reminder_job_failed' }, { status: 500 });
  }
}

export async function GET(request: Request) { return POST(request); }
