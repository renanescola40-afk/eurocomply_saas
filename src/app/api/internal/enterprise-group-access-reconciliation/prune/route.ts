import { z } from 'zod';

import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { pruneEnterpriseGroupAccessReconciliationJobs } from '@/server/enterprise/group-access-reconciliation-operations';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
const ROUTE = '/api/internal/enterprise-group-access-reconciliation/prune';
const daysSchema = z.coerce.number().int().min(7).max(365).default(30);

export async function POST(request: Request) {
  const limited = await enforceInternalAuthenticationRateLimit(request, { route: ROUTE, action: 'prune_enterprise_reconciliation' });
  if (limited) return limited;
  if (!isAuthorizedInternalCronRequest(request)) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  try {
    const days = daysSchema.parse(new URL(request.url).searchParams.get('days') ?? 30);
    return noStoreJson({ ok: true, result: await pruneEnterpriseGroupAccessReconciliationJobs(days) });
  } catch {
    return noStoreJson({ error: 'enterprise_reconciliation_prune_unavailable' }, { status: 503 });
  }
}
