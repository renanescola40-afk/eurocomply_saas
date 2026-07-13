import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { noStoreJson } from '@/server/security/no-store';

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

export async function enforceInternalAuthenticationRateLimit(
  request: Request,
  options: {
    route: string;
    action: string;
    limit?: number;
    windowMs?: number;
  },
) {
  const rateLimit = await checkDistributedRateLimit({
    key: `internal-auth:${options.route}`,
    policy: 'auth',
    route: options.route,
    action: options.action,
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    limit: options.limit ?? DEFAULT_LIMIT,
    windowMs: options.windowMs ?? DEFAULT_WINDOW_MS,
    failureMode: 'fail-closed',
  });

  if (rateLimit.allowed) return null;

  const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));

  return noStoreJson(
    {
      error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status: rateLimit.reason ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    },
  );
}
