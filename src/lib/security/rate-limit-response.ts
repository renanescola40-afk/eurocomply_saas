import { noStoreJson } from '@/server/security/no-store';
import type { RateLimitResult } from './rate-limit';

export function rateLimitResponse(result: RateLimitResult, message = 'Too many requests') {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const isSecurityControlUnavailable = Boolean(result.reason);

  return noStoreJson(
    { error: isSecurityControlUnavailable ? 'security_control_unavailable' : message },
    {
      status: isSecurityControlUnavailable ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
      },
    },
  );
}
