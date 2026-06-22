import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  checkDistributedRateLimit as checkServerDistributedRateLimit,
  checkRateLimitPolicy,
  clearRateLimitBuckets,
  getClientIpFromRequest,
  getRateLimitHeaders,
  hashRateLimitIp,
  isRateLimited,
  type RateLimitOptions,
} from '@/server/security/rate-limit';

export {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  checkRateLimitPolicy,
  clearRateLimitBuckets,
  getClientIpFromRequest,
  getRateLimitHeaders,
  hashRateLimitIp,
  isRateLimited,
};

export type {
  RateLimitCategory,
  RateLimitFailureMode,
  RateLimitFailureReason,
  RateLimitOptions,
  RateLimitPolicy,
  RateLimitResult,
  RateLimitSubject,
} from '@/server/security/rate-limit';

export function checkDistributedRateLimit(options: RateLimitOptions) {
  return checkServerDistributedRateLimit({
    // Legacy callers predate categories and are mostly sensitive mutations; keep them fail-closed by default.
    category: 'auth',
    ...options,
  });
}
