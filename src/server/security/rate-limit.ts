import { createHash } from 'node:crypto';

export type RateLimitPolicyId =
  | 'auth'
  | 'password-reset'
  | 'step-up-challenge'
  | 'billing-checkout'
  | 'billing-portal'
  | 'team-management'
  | 'upload'
  | 'export'
  | 'gdpr-delete'
  | 'audit-chain-verify'
  | 'webhook'
  | 'general-api'
  | 'health-internal';

export type RateLimitCategory =
  | RateLimitPolicyId
  | 'billing'
  | 'team'
  | 'step-up'
  | 'gdpr'
  | 'audit-chain'
  | 'health/internal';

export type RateLimitFailureReason = 'redis_not_configured' | 'redis_request_failed' | 'redis_unavailable';
export type RateLimitFailureMode = 'fail-closed' | 'fail-open';

export type RateLimitPolicy = {
  id: RateLimitPolicyId;
  category: RateLimitCategory;
  limit: number;
  windowMs: number;
  failureMode: RateLimitFailureMode;
  auditOnBlock: boolean;
  highRisk: boolean;
  includeUserAgent: boolean;
  description: string;
};

export type RateLimitSubject = {
  userId?: string | null;
  organizationId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  action: string;
  route: string;
};

export type RateLimitOptions = Partial<RateLimitSubject> & {
  key?: string;
  policy?: RateLimitPolicyId;
  category?: RateLimitCategory;
  limit?: number;
  windowMs?: number;
  windowSeconds?: number;
  failureMode?: RateLimitFailureMode;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  category: RateLimitCategory;
  policy: RateLimitPolicyId;
  highRisk: boolean;
  failureMode: RateLimitFailureMode;
  audit: boolean;
  key: string;
  userId: string | null;
  organizationId: string | null;
  route: string;
  action: string;
  reason?: RateLimitFailureReason;
};

type LocalBucket = { count: number; resetAt: number };
type UpstashPipelineItem = [unknown, unknown] | { result?: unknown; error?: unknown };

const localBuckets = new Map<string, LocalBucket>();

const POLICIES: Record<RateLimitPolicyId, RateLimitPolicy> = {
  auth: policy('auth', 'auth', 5, 15 * 60_000, 'fail-closed', true, true, true, 'Login, signup and authentication abuse protection.'),
  'password-reset': policy('password-reset', 'auth', 3, 60 * 60_000, 'fail-closed', true, true, true, 'Password reset request and token abuse protection.'),
  'step-up-challenge': policy('step-up-challenge', 'step-up', 5, 5 * 60_000, 'fail-closed', true, true, true, 'Step-up challenge abuse protection.'),
  'billing-checkout': policy('billing-checkout', 'billing', 10, 60_000, 'fail-closed', true, true, true, 'Checkout session abuse protection.'),
  'billing-portal': policy('billing-portal', 'billing', 10, 60_000, 'fail-closed', true, true, true, 'Customer portal session abuse protection.'),
  'team-management': policy('team-management', 'team', 10, 10 * 60_000, 'fail-closed', true, true, true, 'Team invitation, role and membership mutation abuse protection.'),
  upload: policy('upload', 'upload', 20, 10 * 60_000, 'fail-closed', true, true, true, 'Upload and scan entrypoint abuse protection.'),
  export: policy('export', 'export', 5, 10 * 60_000, 'fail-closed', true, true, true, 'Export and scraping abuse protection.'),
  'gdpr-delete': policy('gdpr-delete', 'gdpr', 3, 60 * 60_000, 'fail-closed', true, true, true, 'GDPR delete workflow abuse protection.'),
  'audit-chain-verify': policy('audit-chain-verify', 'audit-chain', 10, 60 * 60_000, 'fail-closed', true, true, true, 'Audit-chain verification exhaustion protection.'),
  webhook: policy('webhook', 'webhook', 120, 60_000, 'fail-closed', true, true, false, 'Webhook flood protection.'),
  'general-api': policy('general-api', 'general-api', 300, 60_000, 'fail-open', false, false, false, 'Lower-risk API request protection.'),
  'health-internal': policy('health-internal', 'health/internal', 120, 60_000, 'fail-open', false, false, false, 'Health and internal probe protection.'),
};

export const RATE_LIMIT_POLICY_IDS = Object.keys(POLICIES) as RateLimitPolicyId[];
export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  ...POLICIES,
  billing: POLICIES['billing-checkout'],
  team: POLICIES['team-management'],
  'step-up': POLICIES['step-up-challenge'],
  gdpr: POLICIES['gdpr-delete'],
  'audit-chain': POLICIES['audit-chain-verify'],
  'health/internal': POLICIES['health-internal'],
};

function policy(
  id: RateLimitPolicyId,
  category: RateLimitCategory,
  limit: number,
  windowMs: number,
  failureMode: RateLimitFailureMode,
  auditOnBlock: boolean,
  highRisk: boolean,
  includeUserAgent: boolean,
  description: string,
): RateLimitPolicy {
  return { id, category, limit, windowMs, failureMode, auditOnBlock, highRisk, includeUserAgent, description };
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function salt() {
  return process.env.RATE_LIMIT_IP_HASH_SALT ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? 'development-rate-limit-salt';
}

function safeToken(value: string | null | undefined, fallback: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? normalized.replace(/[^a-zA-Z0-9:_@.-]/g, '_').slice(0, 160) : fallback;
}

function hashMaterial(kind: string, value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return 'anonymous';
  return createHash('sha256').update(`${kind}:${salt()}:${normalized}`).digest('hex').slice(0, 20);
}

function hashOpaqueKey(value: string) {
  return createHash('sha256').update(`legacy:${value}`).digest('hex').slice(0, 20);
}

export function hashRateLimitIp(ip: string | null | undefined) {
  return hashMaterial('ip', ip);
}

export function hashRateLimitUserAgent(userAgent: string | null | undefined) {
  return hashMaterial('ua', userAgent);
}

export function getClientIpFromRequest(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('cf-connecting-ip')?.trim()
    || null;
}

export function getUserAgentFromRequest(request: Request) {
  return request.headers.get('user-agent');
}

function routeFromRequest(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return 'unknown';
  }
}

export function buildRateLimitSubjectFromRequest(request: Request, subject: Partial<RateLimitSubject> = {}): RateLimitSubject {
  return {
    userId: subject.userId ?? null,
    organizationId: subject.organizationId ?? null,
    ip: subject.ip ?? getClientIpFromRequest(request),
    userAgent: subject.userAgent ?? getUserAgentFromRequest(request),
    action: subject.action ?? 'unknown',
    route: subject.route ?? routeFromRequest(request),
  };
}

function inferPolicyId(value?: string | null): RateLimitPolicyId | null {
  const normalized = value?.toLowerCase() ?? '';
  if (!normalized) return null;
  if (normalized.includes('password') || normalized.includes('reset')) return 'password-reset';
  if (normalized.includes('billing') && normalized.includes('portal')) return 'billing-portal';
  if (normalized.includes('billing') || normalized.includes('checkout')) return 'billing-checkout';
  if (normalized.includes('team') || normalized.includes('invite') || normalized.includes('member-role') || normalized.includes('member-remove')) return 'team-management';
  if (normalized.includes('upload') || normalized.includes('document')) return 'upload';
  if (normalized.includes('gdpr') && normalized.includes('delete')) return 'gdpr-delete';
  if (normalized.includes('audit-chain') || normalized.includes('audit_chain')) return 'audit-chain-verify';
  if (normalized.includes('export') || normalized.includes('.csv') || normalized.includes('evidence-pack')) return 'export';
  if (normalized.includes('step-up') || normalized.includes('step_up') || normalized.includes('mfa')) return 'step-up-challenge';
  if (normalized.includes('webhook') || normalized.includes('stripe')) return 'webhook';
  if (normalized.includes('health') || normalized.includes('internal') || normalized.includes('ready')) return 'health-internal';
  if (normalized.includes('auth') || normalized.includes('login')) return 'auth';
  return null;
}

function resolvePolicyId(policyOrCategory?: RateLimitPolicyId | RateLimitCategory, legacyKey?: string): RateLimitPolicyId {
  if (policyOrCategory && policyOrCategory in POLICIES) return policyOrCategory as RateLimitPolicyId;
  if (policyOrCategory === 'billing') return 'billing-checkout';
  if (policyOrCategory === 'team') return 'team-management';
  if (policyOrCategory === 'step-up') return 'step-up-challenge';
  if (policyOrCategory === 'gdpr') return 'gdpr-delete';
  if (policyOrCategory === 'audit-chain') return 'audit-chain-verify';
  if (policyOrCategory === 'health/internal') return 'health-internal';
  return inferPolicyId(legacyKey) ?? 'auth';
}

function resolvePolicy(options: RateLimitOptions) {
  return POLICIES[resolvePolicyId(options.policy ?? options.category, options.key)];
}

export function buildRateLimitKey(policyOrCategory: RateLimitPolicyId | RateLimitCategory, subject: RateLimitSubject) {
  const policy = POLICIES[resolvePolicyId(policyOrCategory)];
  const userAgentPart = policy.includeUserAgent ? `ua:${hashRateLimitUserAgent(subject.userAgent)}` : 'ua:omitted';
  return [
    `policy:${policy.id}`,
    `route:${safeToken(subject.route, 'unknown')}`,
    `action:${safeToken(subject.action, 'unknown')}`,
    `org:${safeToken(subject.organizationId, 'none')}`,
    `user:${safeToken(subject.userId, 'anonymous')}`,
    `ip:${hashRateLimitIp(subject.ip)}`,
    userAgentPart,
  ].join(':');
}

function subjectFromOptions(options: RateLimitOptions): RateLimitSubject {
  return {
    userId: options.userId ?? null,
    organizationId: options.organizationId ?? null,
    ip: options.ip ?? null,
    userAgent: options.userAgent ?? null,
    action: options.action ?? 'unknown',
    route: options.route ?? 'unknown',
  };
}

function hasSubject(options: RateLimitOptions) {
  return Boolean(options.userId || options.organizationId || options.ip || options.userAgent || options.action || options.route);
}

function resolveKey(options: RateLimitOptions, policy: RateLimitPolicy) {
  if (hasSubject(options)) {
    const key = buildRateLimitKey(policy.id, subjectFromOptions(options));
    return options.key ? `${key}:legacy:${hashOpaqueKey(options.key)}` : key;
  }
  return options.key ? safeToken(options.key, 'unknown') : buildRateLimitKey(policy.id, subjectFromOptions(options));
}

function createResult(input: {
  allowed: boolean;
  limit: number;
  count?: number;
  resetAt: number;
  policy: RateLimitPolicy;
  failureMode: RateLimitFailureMode;
  audit: boolean;
  key: string;
  subject: RateLimitSubject;
  reason?: RateLimitFailureReason;
  now: number;
}): RateLimitResult {
  return {
    allowed: input.allowed,
    limit: input.limit,
    remaining: input.allowed ? Math.max(0, input.limit - (input.count ?? 0)) : 0,
    resetAt: input.resetAt,
    retryAfterSeconds: Math.max(0, Math.ceil((input.resetAt - input.now) / 1000)),
    category: input.policy.category,
    policy: input.policy.id,
    highRisk: input.policy.highRisk,
    failureMode: input.failureMode,
    audit: input.audit,
    key: input.key,
    userId: input.subject.userId?.trim() || null,
    organizationId: input.subject.organizationId?.trim() || null,
    route: input.subject.route,
    action: input.subject.action,
    reason: input.reason,
  };
}

function localIncrement(key: string, windowMs: number, now: number) {
  const current = localBuckets.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    localBuckets.set(key, next);
    return next;
  }
  const next = { count: current.count + 1, resetAt: current.resetAt };
  localBuckets.set(key, next);
  return next;
}

function readPipelineResult(item: UpstashPipelineItem | undefined) {
  if (!item) return undefined;
  if (Array.isArray(item)) return item[1];
  if (item.error) return undefined;
  return item.result;
}

async function incrementUpstash(key: string, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { configured: false as const };

  const redisKey = `eurocomply:rate-limit:${key.replace(/[^a-zA-Z0-9:_@.-]/g, '_')}`;
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', redisKey], ['EXPIRE', redisKey, windowSeconds, 'NX'], ['TTL', redisKey]]),
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) return { configured: true as const, ok: false as const };

  const payload = (await response.json()) as UpstashPipelineItem[];
  const count = Number(readPipelineResult(payload[0]));
  const ttl = Number(readPipelineResult(payload[2]));
  if (!Number.isFinite(count) || count < 0) return { configured: true as const, ok: false as const };
  return {
    configured: true as const,
    ok: true as const,
    count,
    resetAt: Date.now() + Math.max(1, Number.isFinite(ttl) && ttl > 0 ? ttl : windowSeconds) * 1000,
  };
}

export async function checkDistributedRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const policy = resolvePolicy(options);
  const limit = Math.max(1, Math.ceil(options.limit ?? policy.limit));
  const windowMs = typeof options.windowMs === 'number'
    ? Math.max(1, Math.ceil(options.windowMs))
    : typeof options.windowSeconds === 'number'
      ? Math.max(1, Math.ceil(options.windowSeconds)) * 1000
      : policy.windowMs;
  const failureMode = isProductionRuntime() && policy.highRisk
    ? 'fail-closed'
    : options.failureMode ?? policy.failureMode;
  const key = resolveKey(options, policy);
  const subject = subjectFromOptions(options);
  const now = options.now ?? Date.now();
  const base = { limit, resetAt: now + windowMs, policy, failureMode, key, subject, now };

  try {
    const upstash = await incrementUpstash(key, Math.max(1, Math.ceil(windowMs / 1000)));
    if (!upstash.configured) {
      if (isProductionRuntime()) {
        console.error('[security:rate-limit] Upstash Redis is not configured.', { policy: policy.id, failureMode });
        return createResult({
          ...base,
          allowed: failureMode === 'fail-open',
          audit: failureMode === 'fail-closed' && policy.auditOnBlock,
          reason: 'redis_not_configured',
        });
      }
    } else if (upstash.ok) {
      const allowed = upstash.count <= limit;
      return createResult({
        ...base,
        allowed,
        count: upstash.count,
        resetAt: upstash.resetAt,
        audit: !allowed && policy.auditOnBlock,
      });
    } else if (isProductionRuntime()) {
      console.error('[security:rate-limit] Upstash Redis request failed.', { policy: policy.id, failureMode });
      return createResult({
        ...base,
        allowed: failureMode === 'fail-open',
        audit: failureMode === 'fail-closed' && policy.auditOnBlock,
        reason: 'redis_request_failed',
      });
    }
  } catch {
    if (isProductionRuntime()) {
      console.error('[security:rate-limit] Upstash Redis unavailable.', { policy: policy.id, failureMode });
      return createResult({
        ...base,
        allowed: failureMode === 'fail-open',
        audit: failureMode === 'fail-closed' && policy.auditOnBlock,
        reason: 'redis_unavailable',
      });
    }
  }

  const local = localIncrement(key, windowMs, now);
  const allowed = local.count <= limit;
  return createResult({
    ...base,
    allowed,
    count: local.count,
    resetAt: local.resetAt,
    audit: !allowed && policy.auditOnBlock,
  });
}

export async function checkRateLimitPolicy(
  policyOrCategory: RateLimitPolicyId | RateLimitCategory,
  subject: RateLimitSubject,
  overrides: Omit<RateLimitOptions, keyof RateLimitSubject | 'category' | 'key' | 'policy'> = {},
) {
  return checkDistributedRateLimit({ ...overrides, policy: resolvePolicyId(policyOrCategory), ...subject });
}

export async function isRateLimited(options: RateLimitOptions) {
  return !(await checkDistributedRateLimit(options)).allowed;
}

export function getRateLimitHeaders(result: RateLimitResult, now = Date.now()) {
  const retryAfterSeconds = Math.max(0, Math.ceil((result.resetAt - now) / 1000));
  return {
    'Retry-After': String(Math.max(1, retryAfterSeconds)),
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.max(1, retryAfterSeconds)),
  };
}

export function clearRateLimitBuckets() {
  localBuckets.clear();
}
