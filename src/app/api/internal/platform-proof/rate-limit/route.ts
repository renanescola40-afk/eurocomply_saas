import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { checkDistributedRateLimit } from '@/server/security/rate-limit';
import { noStoreJson } from '@/server/security/no-store';
import { authorizePlatformProofRequest } from '@/server/security/platform-proof';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/internal/platform-proof/rate-limit';

export async function GET(request: Request) {
  const authorization = await authorizePlatformProofRequest(request, {
    route: ROUTE,
    action: 'platform_proof_rate_limit_auth',
    authLimit: 100,
  });
  if (!authorization.ok) return authorization.response;

  const rateLimit = await checkDistributedRateLimit({
    key: `platform-proof:${authorization.releaseSha}`,
    policy: 'health-internal',
    route: ROUTE,
    action: 'platform_proof_rate_limit',
    ip: null,
    userAgent: null,
    limit: 5,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  return noStoreJson({ ok: true, distributed: true, remaining: rateLimit.remaining });
}
