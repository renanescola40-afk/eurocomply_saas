export {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  checkDistributedRateLimit,
  checkRateLimitPolicy,
  clearRateLimitBuckets,
  getClientIpFromRequest,
  getRateLimitHeaders,
  hashRateLimitIp,
  isRateLimited,
} from '@/server/security/rate-limit';

export type {
  RateLimitCategory,
  RateLimitFailureMode,
  RateLimitFailureReason,
  RateLimitOptions,
  RateLimitPolicy,
  RateLimitResult,
  RateLimitSubject,
} from '@/server/security/rate-limit';

export function checkRateLimit() {
  throw new Error('Synchronous local rate limiting is not supported. Use checkDistributedRateLimit instead.');
}
