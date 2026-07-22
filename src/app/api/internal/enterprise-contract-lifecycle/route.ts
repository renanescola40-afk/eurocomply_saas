import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { processEnterpriseContractLifecycle } from '@/server/enterprise/contract-lifecycle';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-contract-lifecycle';
const AUTH_ACTION = 'authenticate_enterprise_contract_lifecycle';
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

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
    const lifecycle = await processEnterpriseContractLifecycle(getBatchSize(request));
    return noStoreJson({ ok: true, lifecycle });
  } catch (error) {
    reportError(error, { area: 'enterprise_contract_lifecycle' });
    return noStoreJson({ error: 'enterprise_contract_lifecycle_unavailable' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
