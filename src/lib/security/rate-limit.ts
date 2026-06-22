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
  type RateLimitCategory,
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

function inferLegacyRateLimitCategory(key: string | undefined): RateLimitCategory {
  const normalized = key?.toLowerCase() ?? '';

  if (normalized.includes('billing') || normalized.includes('checkout') || normalized.includes('portal')) return 'billing';
  if (normalized.includes('upload') || normalized.includes('document')) return 'upload';
  if (normalized.includes('export') || normalized.includes('.csv') || normalized.includes('evidence-pack')) return 'export';
  if (normalized.includes('step-up') || normalized.includes('step_up') || normalized.includes('mfa')) return 'step-up';
  if (normalized.includes('webhook') || normalized.includes('stripe')) return 'webhook';
  if (normalized.includes('health') || normalized.includes('internal') || normalized.includes('ready')) return 'health/internal';
  if (normalized.includes('auth') || normalized.includes('login') || normalized.includes('password') || normalized.includes('reset')) return 'auth';

  // Legacy callers predate categories and are mostly sensitive mutations; keep unknown keys fail-closed.
  return 'auth';
}

export function checkDistributedRateLimit(options: RateLimitOptions) {
  return checkServerDistributedRateLimit({
    category: inferLegacyRateLimitCategory(options.key),
    ...options,
  });
}
