import { z } from 'zod';

import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { expirePrivilegedAccess } from '@/server/enterprise/privileged-access-governance';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-privileged-access-expiry';
const limitSchema = z.coerce.number().int().min(1).max(500).default(100);

export async function POST(request: Request) {
  const limited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: 'expire_privileged_access',
  });
  if (limited) return limited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = limitSchema.parse(url.searchParams.get('limit') ?? 100);
    return noStoreJson(await expirePrivilegedAccess(limit));
  } catch {
    return noStoreJson({ error: 'privileged_access_expiry_failed' }, { status: 503 });
  }
}
