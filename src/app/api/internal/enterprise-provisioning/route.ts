import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { processEnterpriseProvisioningBatch } from '@/server/enterprise/bulk-provisioning-worker';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-provisioning';
const AUTH_ACTION = 'authenticate_enterprise_provisioning_worker';
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;

function getBatchSize(request: Request) {
  const value = Number(new URL(request.url).searchParams.get('batchSize') ?? DEFAULT_BATCH_SIZE);
  if (!Number.isSafeInteger(value)) return DEFAULT_BATCH_SIZE;
  return Math.min(Math.max(value, 1), MAX_BATCH_SIZE);
}

export async function POST(request: Request) {
  const authRateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: AUTH_ACTION,
  });
  if (authRateLimited) return authRateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processEnterpriseProvisioningBatch(getBatchSize(request));
    const hasFailures = result.failed > 0;

    return noStoreJson(
      {
        ok: !hasFailures,
        worker: result,
      },
      { status: hasFailures ? 207 : 200 },
    );
  } catch (error) {
    reportError(error, { area: 'enterprise_provisioning_worker' });
    return noStoreJson({ error: 'enterprise_provisioning_worker_unavailable' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
