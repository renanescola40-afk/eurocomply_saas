import { z } from 'zod';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { expireBreakGlassRequests } from '@/server/enterprise/break-glass-governance';
import { noStoreJson } from '@/server/security/no-store';

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) });

export async function POST(request: Request) {
  if (!isAuthorizedInternalCronRequest(request)) return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  const parsed = querySchema.safeParse({ limit: new URL(request.url).searchParams.get('limit') ?? 100 });
  if (!parsed.success) return noStoreJson({ error: 'invalid_limit' }, { status: 400 });
  try {
    const expired = await expireBreakGlassRequests(parsed.data.limit);
    return noStoreJson({ expiredCount: expired.length, expired });
  } catch {
    return noStoreJson({ error: 'break_glass_expiry_failed' }, { status: 503 });
  }
}
