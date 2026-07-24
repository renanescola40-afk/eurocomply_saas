import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { getEnterpriseGroupAccessReconciliationStatus } from '@/server/enterprise/group-access-reconciliation-operations';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
const ROUTE = '/api/internal/enterprise-group-access-reconciliation/status';

export async function GET(request: Request) {
  const limited = await enforceInternalAuthenticationRateLimit(request, { route: ROUTE, action: 'read_enterprise_reconciliation_status' });
  if (limited) return limited;
  if (!isAuthorizedInternalCronRequest(request)) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  try {
    return noStoreJson({ ok: true, status: await getEnterpriseGroupAccessReconciliationStatus() });
  } catch {
    return noStoreJson({ error: 'enterprise_reconciliation_status_unavailable' }, { status: 503 });
  }
}
