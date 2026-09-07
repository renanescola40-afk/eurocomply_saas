import { processLinkedInMarketingQueue } from '@/lib/marketing/linkedin-queue';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/marketing/linkedin/process';
const AUTH_ACTION = 'authenticate_linkedin_marketing_process';
const BATCH_SIZE = 3;

function isRecurringPublishingEnabled() {
  return process.env.LINKEDIN_RECURRING_PUBLISHING_ENABLED === 'true';
}

export async function POST(request: Request) {
  const rateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: AUTH_ACTION,
  });
  if (rateLimited) return rateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  // Recurring publishing is a distinct Production activation gate. Keep the
  // cron endpoint healthy but do not touch the queue or LinkedIn until the
  // operator has passed the Standard-tier + Production acceptance gates.
  if (!isRecurringPublishingEnabled()) {
    return noStoreJson({
      ok: true,
      enabled: false,
      claimed: 0,
      published: 0,
      failed: 0,
      needsReview: 0,
    });
  }

  try {
    const result = await processLinkedInMarketingQueue(BATCH_SIZE);
    return noStoreJson({
      ok: true,
      enabled: true,
      claimed: result.claimed,
      published: result.published,
      failed: result.failed,
      needsReview: result.needsReview,
    });
  } catch (error) {
    reportError(error, { area: 'linkedin_marketing_queue_process' });
    return noStoreJson({ error: 'linkedin_marketing_queue_unavailable' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
