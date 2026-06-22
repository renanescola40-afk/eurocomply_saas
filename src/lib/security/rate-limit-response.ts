import { noStoreJson } from '@/server/security/no-store';
import { getRateLimitHeaders, type RateLimitResult } from './rate-limit';

export function rateLimitResponse(result: RateLimitResult, message = 'Too many requests') {
  const isSecurityControlUnavailable = Boolean(result.reason && result.failureMode === 'fail-closed');

  return noStoreJson(
    { error: isSecurityControlUnavailable ? 'security_control_unavailable' : message },
    {
      status: isSecurityControlUnavailable ? 503 : 429,
      headers: getRateLimitHeaders(result),
    },
  );
}
