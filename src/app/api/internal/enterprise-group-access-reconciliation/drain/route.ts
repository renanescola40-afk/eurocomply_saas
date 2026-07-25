import { z } from 'zod';

import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { drainEnterpriseGroupAccessReconciliationQueue } from '@/server/enterprise/group-access-reconciliation-operations';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
const ROUTE = '/api/internal/enterprise-group-access-reconciliation/drain';
const limitSchema = z.coerce.number().int().min(1).max(100).default(25);

export async function POST(request: Request) {
  const limited = await enforceInternalAuthenticationRateLimit(request, { route: ROUTE, action: 'drain_enterprise_reconciliation' });
  if (limited) return limited;
  if (!isAuthorizedInternalCronRequest(request)) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  try {
    const limit = limitSchema.parse(new URL(request.url).searchParams.get('limit') ?? 25);
    return noStoreJson({ ok: true, result: await drainEnterpriseGroupAccessReconciliationQueue(limit) });
  } catch {
    return noStoreJson({ error: 'enterprise_reconciliation_drain_unavailable' }, { status: 503 });
  }
}
