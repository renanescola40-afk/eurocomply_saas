import { processLinkedInMarketingQueue } from '@/lib/marketing/linkedin-queue';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/marketing/linkedin/process';
const AUTH_ACTION = 'authenticate_linkedin_marketing_process';
const BATCH_SIZE = 3;
const CONTROLLED_TEST_HEADER = 'x-risck-linkedin-controlled-test';

function isRecurringPublishingEnabled() {
  return process.env.LINKEDIN_RECURRING_PUBLISHING_ENABLED === 'true';
}

function isControlledWorkerTestAuthorized(request: Request) {
  return process.env.LINKEDIN_CONTROLLED_WORKER_TEST_ENABLED === 'true'
    && request.method === 'POST'
    && request.headers.get(CONTROLLED_TEST_HEADER) === 'true';
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

  const recurringEnabled = isRecurringPublishingEnabled();
  const controlledTest = isControlledWorkerTestAuthorized(request);

  // Recurring publishing is a distinct Production activation gate. The regular
  // cron remains a healthy no-op until Standard-tier + Production acceptance.
  // Development-tier queue validation is possible only through an explicitly
  // enabled POST plus a dedicated controlled-test header, so the scheduled GET
  // cron cannot accidentally become a pre-activation publisher.
  if (!recurringEnabled && !controlledTest) {
    return noStoreJson({
      ok: true,
      enabled: false,
      mode: 'disabled',
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
      enabled: recurringEnabled,
      mode: controlledTest ? 'controlled_test' : 'recurring',
      claimed: result.claimed,
      published: result.published,
      failed: result.failed,
      needsReview: result.needsReview,
    });
  } catch (error) {
    reportError(error, {
      area: 'linkedin_marketing_queue_process',
      mode: controlledTest ? 'controlled_test' : 'recurring',
    });
    return noStoreJson({ error: 'linkedin_marketing_queue_unavailable' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
