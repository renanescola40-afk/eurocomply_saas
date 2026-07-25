import { z } from 'zod';

import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { replayEnterpriseGroupAccessDeadLetterJob } from '@/server/enterprise/group-access-reconciliation-operations';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
const ROUTE = '/api/internal/enterprise-group-access-reconciliation/replay';
const inputSchema = z.object({ jobId: z.string().uuid(), organizationId: z.string().uuid() });

export async function POST(request: Request) {
  const limited = await enforceInternalAuthenticationRateLimit(request, { route: ROUTE, action: 'replay_enterprise_reconciliation' });
  if (limited) return limited;
  if (!isAuthorizedInternalCronRequest(request)) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = inputSchema.parse(await readBoundedJsonRequest(request, { maxBytes: 4096 }));
    return noStoreJson({ ok: true, result: await replayEnterpriseGroupAccessDeadLetterJob(input) });
  } catch (error) {
    if (error instanceof z.ZodError) return noStoreJson({ error: 'invalid_request' }, { status: 400 });
    return noStoreJson({ error: 'enterprise_reconciliation_replay_unavailable' }, { status: 503 });
  }
}
