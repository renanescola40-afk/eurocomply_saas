import { z } from 'zod';

import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  enqueueEnterpriseGroupAccessReconciliation,
  processNextEnterpriseGroupAccessReconciliationJob,
} from '@/server/enterprise/group-access-reconciliation-queue';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-group-access-reconciliation';
const AUTH_ACTION = 'authenticate_enterprise_group_access_reconciliation';
const MAX_BODY_BYTES = 16 * 1024;

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  batchSize: z.number().int().min(1).max(500).optional(),
});

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
    const payload = await readBoundedJsonRequest(request, { maxBytes: MAX_BODY_BYTES });
    const input = inputSchema.parse(payload);
    const queued = await enqueueEnterpriseGroupAccessReconciliation(input);
    const execution = await processNextEnterpriseGroupAccessReconciliationJob(actorUserId);
    return noStoreJson({ ok: true, queued, execution });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return noStoreJson({ error: 'invalid_request_or_server_configuration' }, { status: 400 });
    }
    reportError(error, { area: 'enterprise_group_access_reconciliation' });
    return noStoreJson(
      { error: 'enterprise_group_access_reconciliation_unavailable' },
      { status: 503 },
    );
  }
}
