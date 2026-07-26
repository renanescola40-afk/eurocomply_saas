import { z } from 'zod';

import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { processNextEnterpriseAccessOperation } from '@/server/enterprise/access-operations-center';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-access-operations';
const AUTH_ACTION = 'authenticate_enterprise_access_operations';
const actorSchema = z.string().uuid();

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
    const actorUserId = actorSchema.parse(process.env.ENTERPRISE_RECONCILIATION_ACTOR_USER_ID);
    const result = await processNextEnterpriseAccessOperation(actorUserId);
    return noStoreJson({ ok: true, result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return noStoreJson({ error: 'invalid_server_configuration' }, { status: 503 });
    }
    reportError(error, { area: 'enterprise_access_operations' });
    return noStoreJson({ error: 'enterprise_access_operations_unavailable' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
