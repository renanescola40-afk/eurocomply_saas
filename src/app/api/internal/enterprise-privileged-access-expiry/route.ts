import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { isAuthorizedInternalCronRequest } from '@/server/security/internal-cron';
import { noStoreJson } from '@/server/security/no-store';
import { expirePrivilegedAccess } from '@/server/enterprise/privileged-access-governance';

const limitSchema = z.coerce.number().int().min(1).max(500).default(100);

export async function POST(request: Request) {
  if (!isAuthorizedInternalCronRequest(request)) return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  const rate = await checkDistributedRateLimit({ key: 'internal:enterprise-privileged-access-expiry', policy: 'internal', action: 'expire_privileged_access', route: '/api/internal/enterprise-privileged-access-expiry', limit: 12, windowMs: 60_000, failureMode: 'fail-closed' });
  if (!rate.allowed) return noStoreJson({ error: 'rate_limited' }, { status: 429 });
  try {
    const url = new URL(request.url);
    const limit = limitSchema.parse(url.searchParams.get('limit') ?? 100);
    return noStoreJson(await expirePrivilegedAccess(limit));
  } catch {
    return noStoreJson({ error: 'privileged_access_expiry_failed' }, { status: 503 });
  }
}