import { createHash } from 'node:crypto';

export type RateLimitCategory =
  | 'auth'
  | 'billing'
  | 'upload'
  | 'export'
  | 'step-up'
  | 'webhook'
  | 'health/internal'
  | 'general-api';

export type RateLimitFailureReason = 'redis_not_configured' | 'redis_request_failed' | 'redis_unavailable';

export type RateLimitFailureMode = 'fail-closed' | 'fail-open';

export type RateLimitPolicy = {
  category: RateLimitCategory;
  limit: number;
  windowMs: number;
  failureMode: RateLimitFailureMode;
  auditOnBlock: boolean;
  description: string;
};

export type RateLimitSubject = {
  userId?: string | null;
  organizationId?: string | null;
  ip?: string | null;
  action: string;
  route: string;
};

export type RateLimitOptions = Partial<RateLimitSubject> & {
  key?: string;
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
  failureMode: RateLimitFailureMode;
  audit: boolean;
  key: string;
  reason?: RateLimitFailureReason;
};

type LocalRateLimitEntry = {
  count: number;
  resetAt: number;
};

type UpstashPipelineItem = [unknown, unknown] | { result?: unknown; error?: unknown };
type UpstashPipelineResponse = UpstashPipelineItem[];

const localAttempts = new Map<string, LocalRateLimitEntry>();

export const RATE_LIMIT_POLICIES: Record<RateLimitCategory, RateLimitPolicy> = {
  auth: {
    category: 'auth',
    limit: 5,
    windowMs: 15 * 60 * 1000,
    failureMode: 'fail-closed',
    auditOnBlock: true,
    description: 'Login, signup and password reset abuse protection.',
  },
  billing: {
    category: 'billing',
    limit: 10,
    windowMs: 60 * 1000,
    failureMode: 'fail-closed',
    auditOnBlock: true,
    description: 'Checkout, customer portal and subscription mutations.',
  },
  upload: {
    category: 'upload',
    limit: 20,
    windowMs: 10 * 60 * 1000,
    failureMode: 'fail-closed',
    auditOnBlock: true,
    description: 'Document upload and malware-scan entrypoints.',
  },
  export: {
    category: 'export',
    limit: 5,
    windowMs: 10 * 60 * 1000,
    failureMode: 'fail-closed',
    auditOnBlock: true,
    description: 'CSV, evidence-pack, GDPR and governance exports.',
  },
  'step-up': {
    category: 'step-up',
    limit: 5,
    windowMs: 5 * 60 * 1000,
    failureMode: 'fail-closed',
    auditOnBlock: true,
    description: 'Step-up challenge and sensitive re-authentication flows.',
  },
  webhook: {
    category: 'webhook',
    limit: 120,
    windowMs: 60 * 1000,
    failureMode: 'fail-closed',
    auditOnBlock: true,
    description: 'Internal and provider webhook processing.',
  },
  'health/internal': {
    category: 'health/internal',
    limit: 120,
    windowMs: 60 * 1000,
    failureMode: 'fail-open',
    auditOnBlock: false,
    description: 'Health checks and authenticated internal probes.',
  },
  'general-api': {
    category: 'general-api',
    limit: 300,
    windowMs: 60 * 1000,
    failureMode: 'fail-open',
    auditOnBlock: false,
    description: 'Lower-risk authenticated API reads and non-sensitive API calls.',
  },
};

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function safeToken(value: string | null | undefined, fallback: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return fallback;
  return normalized.replace(/[^a-zA-Z0-9:_@.-]/g, '_').slice(0, 160);
}

function getHashSalt() {
  return process.env.RATE_LIMIT_IP_HASH_SALT ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? 'development-rate-limit-salt';
}

export function hashRateLimitIp(ip: string | null | undefined) {
  const normalized = typeof ip === 'string' ? ip.trim() : '';
  if (!normalized) return 'anonymous';

  return createHash('sha256').update(`${getHashSalt()}:${normalized}`).digest('hex').slice(0, 20);
}

export function getClientIpFromRequest(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();

  return forwardedFor || realIp || vercelIp || null;
}

export function buildRateLimitKey(category: RateLimitCategory, subject: RateLimitSubject) {
  const tenantPart = `org:${safeToken(subject.organizationId, 'none')}`;
  const userPart = `user:${safeToken(subject.userId, 'anonymous')}`;
  const ipPart = `ip:${hashRateLimitIp(subject.ip)}`;
  const actionPart = `action:${safeToken(subject.action, 'unknown')}`;
  const routePart = `route:${safeToken(subject.route, 'unknown')}`;

  return [category, tenantPart, userPart, ipPart, actionPart, routePart].join(':');
}

function normalizeRedisKey(key: string) {
  return `eurocomply:rate-limit:${key.replace(/[^a-zA-Z0-9:_@.-]/g, '_')}`;
}

function getPolicy(category: RateLimitCategory | undefined): RateLimitPolicy {
  return RATE_LIMIT_POLICIES[category ?? 'general-api'];
}

function resolveWindowMs(options: RateLimitOptions, policy: RateLimitPolicy) {
  if (typeof options.windowMs === 'number') return Math.max(1, Math.ceil(options.windowMs));
  if (typeof options.windowSeconds === 'number') return Math.max(1, Math.ceil(options.windowSeconds)) * 1000;
  return policy.windowMs;
}

function resolveFailureMode(options: RateLimitOptions, policy: RateLimitPolicy) {
  return options.failureMode ?? policy.failureMode;
}

function resolveKey(options: RateLimitOptions, category: RateLimitCategory) {
  if (options.key) return safeToken(options.key, 'unknown');

  return buildRateLimitKey(category, {
    userId: options.userId,
    organizationId: options.organizationId,
    ip: options.ip,
    action: options.action ?? 'unknown',
    route: options.route ?? 'unknown',
  });
}

function createResult({
  allowed,
  limit,
  remaining,
  resetAt,
  category,
  failureMode,
  audit,
  key,
  reason,
  now = Date.now(),
}: {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  category: RateLimitCategory;
  failureMode: RateLimitFailureMode;
  audit: boolean;
  key: string;
  reason?: RateLimitFailureReason;
  now?: number;
}): RateLimitResult {
  return {
    allowed,
    limit,
    remaining,
    resetAt,
    retryAfterSeconds: Math.max(0, Math.ceil((resetAt - now) / 1000)),
    category,
    failureMode,
    audit,
    key,
    reason,
  };
}

function failClosed(
  options: {
    limit: number;
    windowMs: number;
    category: RateLimitCategory;
    failureMode: RateLimitFailureMode;
    audit: boolean;
    key: string;
    now: number;
  },
  reason: RateLimitFailureReason,
) {
  return createResult({
    allowed: false,
    limit: options.limit,
    remaining: 0,
    resetAt: options.now + options.windowMs,
    category: options.category,
    failureMode: options.failureMode,
    audit: options.audit,
    key: options.key,
    reason,
    now: options.now,
  });
}

function failOpen(
  options: {
    limit: number;
    windowMs: number;
    category: RateLimitCategory;
    failureMode: RateLimitFailureMode;
    audit: boolean;
    key: string;
    now: number;
  },
  reason: RateLimitFailureReason,
) {
  return createResult({
    allowed: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - 1),
    resetAt: options.now + options.windowMs,
    category: options.category,
    failureMode: options.failureMode,
    audit: false,
    key: options.key,
    reason,
    now: options.now,
  });
}

function incrementLocal(key: string, windowMs: number, now: number) {
  const current = localAttempts.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    localAttempts.set(key, next);
    return next;
  }

  const next = { ...current, count: current.count + 1 };
  localAttempts.set(key, next);
  return next;
}

function readUpstashResult(item: UpstashPipelineItem | undefined) {
  if (!item) return undefined;
  if (Array.isArray(item)) return item[1];
  if (item.error) return undefined;
  return item.result;
}

async function incrementUpstash(key: string, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return { configured: false as const };

  const redisKey = normalizeRedisKey(key);
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, windowSeconds, 'NX'],
      ['TTL', redisKey],
    ]),
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) return { configured: true as const, ok: false as const };

  const payload = (await response.json()) as UpstashPipelineResponse;
  const count = Number(readUpstashResult(payload[0]));
  const ttlValue = Number(readUpstashResult(payload[2]));
  const ttlSeconds = Number.isFinite(ttlValue) && ttlValue > 0 ? ttlValue : windowSeconds;

  if (!Number.isFinite(count) || count < 0) return { configured: true as const, ok: false as const };

  return {
    configured: true as const,
    ok: true as const,
    count,
    resetAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  };
}

function fromCount({
  count,
  resetAt,
  limit,
  category,
  failureMode,
  audit,
  key,
  now,
}: {
  count: number;
  resetAt: number;
  limit: number;
  category: RateLimitCategory;
  failureMode: RateLimitFailureMode;
  audit: boolean;
  key: string;
  now?: number;
}) {
  const allowed = count <= limit;

  return createResult({
    allowed,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    category,
    failureMode,
    audit: !allowed && audit,
    key,
    now,
  });
}

export async function checkDistributedRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const policy = getPolicy(options.category);
  const category = policy.category;
  const limit = Math.max(1, Math.ceil(options.limit ?? policy.limit));
  const windowMs = resolveWindowMs(options, policy);
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const failureMode = resolveFailureMode(options, policy);
  const key = resolveKey(options, category);
  const now = options.now ?? Date.now();
  const failureContext = { limit, windowMs, category, failureMode, audit: policy.auditOnBlock, key, now };

  try {
    const upstash = await incrementUpstash(key, windowSeconds);

    if (!upstash.configured) {
      if (isProductionRuntime()) {
        console.error('[security:rate-limit] Upstash Redis is not configured.', { category, failureMode });
        return failureMode === 'fail-closed'
          ? failClosed(failureContext, 'redis_not_configured')
          : failOpen(failureContext, 'redis_not_configured');
      }

      const local = incrementLocal(key, windowMs, now);
      return fromCount({ count: local.count, resetAt: local.resetAt, limit, category, failureMode, audit: policy.auditOnBlock, key, now });
    }

    if (upstash.ok) {
      return fromCount({ count: upstash.count, resetAt: upstash.resetAt, limit, category, failureMode, audit: policy.auditOnBlock, key });
    }

    console.error('[security:rate-limit] Upstash Redis request failed.', { category, failureMode });
    if (isProductionRuntime()) {
      return failureMode === 'fail-closed'
        ? failClosed(failureContext, 'redis_request_failed')
        : failOpen(failureContext, 'redis_request_failed');
    }
  } catch {
    console.error('[security:rate-limit] Upstash Redis unavailable.', { category, failureMode });
    if (isProductionRuntime()) {
      return failureMode === 'fail-closed'
        ? failClosed(failureContext, 'redis_unavailable')
        : failOpen(failureContext, 'redis_unavailable');
    }
  }

  const local = incrementLocal(key, windowMs, now);
  return fromCount({ count: local.count, resetAt: local.resetAt, limit, category, failureMode, audit: policy.auditOnBlock, key, now });
}

export async function checkRateLimitPolicy(category: RateLimitCategory, subject: RateLimitSubject, overrides: Omit<RateLimitOptions, keyof RateLimitSubject | 'category' | 'key'> = {}) {
  return checkDistributedRateLimit({
    ...overrides,
    category,
    ...subject,
  });
}

export async function isRateLimited(options: RateLimitOptions) {
  const result = await checkDistributedRateLimit(options);
  return !result.allowed;
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
  localAttempts.clear();
}
