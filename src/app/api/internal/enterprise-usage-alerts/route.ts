import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { evaluateAndNotifyEnterpriseUsageAlerts } from '@/server/enterprise/usage-alerts';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-usage-alerts';
const AUTH_ACTION = 'authenticate_enterprise_usage_alerts';
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
    const alerts = await evaluateAndNotifyEnterpriseUsageAlerts(getBatchSize(request));
    return noStoreJson({ ok: true, alerts });
  } catch (error) {
    reportError(error, { area: 'enterprise_usage_alerts' });
    return noStoreJson({ error: 'enterprise_usage_alerts_unavailable' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
