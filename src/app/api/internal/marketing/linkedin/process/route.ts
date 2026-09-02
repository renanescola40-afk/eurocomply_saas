import { processLinkedInMarketingQueue } from '@/lib/marketing/linkedin-queue';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/marketing/linkedin/process';
const AUTH_ACTION = 'authenticate_linkedin_marketing_process';
const BATCH_SIZE = 3;

export async function POST(request: Request) {
  const rateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: AUTH_ACTION,
  });
  if (rateLimited) return rateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processLinkedInMarketingQueue(BATCH_SIZE);
    return noStoreJson({
      ok: true,
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
