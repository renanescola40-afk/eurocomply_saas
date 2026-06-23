import {
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_POLICY_IDS,
  buildRateLimitKey,
  buildRateLimitSubjectFromRequest,
  checkDistributedRateLimit as checkServerDistributedRateLimit,
  checkRateLimitPolicy,
  clearRateLimitBuckets,
  getClientIpFromRequest,
  getRateLimitHeaders,
  getUserAgentFromRequest,
  hashRateLimitIp,
  hashRateLimitUserAgent,
  isRateLimited,
  type RateLimitCategory,
  type RateLimitOptions,
  type RateLimitPolicyId,
} from '@/server/security/rate-limit';

export {
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_POLICY_IDS,
  buildRateLimitKey,
  buildRateLimitSubjectFromRequest,
  checkRateLimitPolicy,
  clearRateLimitBuckets,
  getClientIpFromRequest,
  getRateLimitHeaders,
  getUserAgentFromRequest,
  hashRateLimitIp,
  hashRateLimitUserAgent,
  isRateLimited,
};

export type {
  RateLimitCategory,
  RateLimitFailureMode,
  RateLimitFailureReason,
  RateLimitOptions,
  RateLimitPolicy,
  RateLimitPolicyId,
  RateLimitResult,
  RateLimitSubject,
} from '@/server/security/rate-limit';

function inferLegacyRateLimitCategory(key: string | undefined): RateLimitCategory {
  const normalized = key?.toLowerCase() ?? '';

  if (normalized.includes('password') || normalized.includes('reset')) return 'password-reset';
  if (normalized.includes('billing') && normalized.includes('portal')) return 'billing-portal';
  if (normalized.includes('billing') || normalized.includes('checkout')) return 'billing-checkout';
  if (normalized.includes('upload') || normalized.includes('document')) return 'upload';
  if (normalized.includes('gdpr') && normalized.includes('delete')) return 'gdpr-delete';
  if (normalized.includes('audit-chain') || normalized.includes('audit_chain')) return 'audit-chain-verify';
  if (normalized.includes('export') || normalized.includes('.csv') || normalized.includes('evidence-pack')) return 'export';
  if (normalized.includes('step-up') || normalized.includes('step_up') || normalized.includes('mfa')) return 'step-up-challenge';
  if (normalized.includes('webhook') || normalized.includes('stripe')) return 'webhook';
  if (normalized.includes('health') || normalized.includes('internal') || normalized.includes('ready')) return 'health-internal';
  if (normalized.includes('auth') || normalized.includes('login')) return 'auth';

  // Legacy callers predate named policies and are often sensitive mutations; keep unknown keys fail-closed.
  return 'auth';
}

export function checkDistributedRateLimit(options: RateLimitOptions) {
  return checkServerDistributedRateLimit({
    ...options,
    category: options.policy ? options.category : options.category ?? inferLegacyRateLimitCategory(options.key),
  });
}
