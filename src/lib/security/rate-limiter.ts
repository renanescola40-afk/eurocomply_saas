/**
 * src/lib/security/rate-limiter.ts
 *
 * Rate limiting para Next.js API Routes.
 *
 * Produção é fail-closed: se Upstash Redis não estiver configurado ou ficar
 * indisponível, APIs sensíveis devem bloquear a ação em vez de cair para
 * memória local. O fallback em memória existe apenas para desenvolvimento e
 * testes locais.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

class InMemoryRateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Object.keys(this.store).forEach((key) => {
        if (this.store[key].resetAt <= now) {
          delete this.store[key];
        }
      });
    }, 5 * 60 * 1000);
  }

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || entry.resetAt <= now) {
      this.store[key] = { count: 1, resetAt: now + windowMs };
      return { success: true, remaining: limit - 1, reset: now + windowMs };
    }

    if (entry.count < limit) {
      entry.count += 1;
      return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
    }

    return { success: false, remaining: 0, reset: entry.resetAt };
  }
}

const inMemoryLimiter = new InMemoryRateLimiter();
const UPSTASH_RESPONSE_MAX_BYTES = 64 * 1024;

export interface RateLimitOptions {
  /** Identificador único — IP, user ID ou organization ID. */
  key: string;
  /** Máximo de pedidos na janela. */
  limit?: number;
  /** Janela em milissegundos. */
  windowMs?: number;
  /** Texto describing who is limited. */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  reason?: 'redis_not_configured' | 'redis_request_failed' | 'redis_unavailable';
}

type UpstashPipelineResponse = Array<[unknown, unknown]>;

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function failClosed(windowMs: number, reason: NonNullable<RateLimitResult['reason']>): RateLimitResult {
  return {
    success: false,
    remaining: 0,
    reset: Date.now() + Math.max(windowMs, 1),
    reason,
  };
}

function normalizeRedisKey(key: string) {
  return `eurocomply:rate-limit:${key.replace(/[^a-zA-Z0-9:_-]/g, '_')}`;
}

async function readBoundedUpstashResponse(response: Response): Promise<UpstashPipelineResponse> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number.parseInt(declaredLength, 10);
    if (Number.isFinite(parsedLength) && parsedLength > UPSTASH_RESPONSE_MAX_BYTES) {
      throw new Error('upstash_response_too_large');
    }
  }

  if (!response.body) {
    throw new Error('upstash_response_body_missing');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > UPSTASH_RESPONSE_MAX_BYTES) {
        await reader.cancel('upstash_response_too_large');
        throw new Error('upstash_response_too_large');
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(body);
  return JSON.parse(decoded) as UpstashPipelineResponse;
}

async function upstashRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return failClosed(windowMs, 'redis_not_configured');
  }

  const redisKey = normalizeRedisKey(key);
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
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

  if (!response.ok) {
    console.error('[security:rate-limiter] Upstash Redis request failed.', { status: response.status });
    return failClosed(windowMs, 'redis_request_failed');
  }

  const results = await readBoundedUpstashResponse(response);
  const count = Number(results[0]?.[1] ?? 1);
  const ttlSeconds = Number(results[2]?.[1] ?? windowSeconds);
  const reset = Date.now() + Math.max(ttlSeconds, 0) * 1000;

  return {
    success: count <= limit,
    remaining: Math.max(limit - count, 0),
    reset,
  };
}

/**
 * Rate limit genérico.
 *
 * Produção: usa Upstash Redis e bloqueia se a configuração/serviço falhar.
 * Dev/test: usa Upstash quando configurado; caso contrário, usa memória local.
 */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit = 100, windowMs = 60 * 1000 } = options;
  const hasRedisConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  if (!hasRedisConfig) {
    if (isProductionRuntime()) {
      console.error('[security:rate-limiter] Upstash Redis is not configured; blocking production request.');
      return failClosed(windowMs, 'redis_not_configured');
    }

    return inMemoryLimiter.check(key, limit, windowMs);
  }

  try {
    const result = await upstashRateLimit(key, limit, windowMs);

    if (!result.success && result.reason && !isProductionRuntime()) {
      return inMemoryLimiter.check(key, limit, windowMs);
    }

    return result;
  } catch {
    console.error('[security:rate-limiter] Upstash Redis unavailable.');

    if (isProductionRuntime()) {
      return failClosed(windowMs, 'redis_unavailable');
    }

    return inMemoryLimiter.check(key, limit, windowMs);
  }
}

export async function rateLimitByIp(
  req: NextRequest,
  options?: Partial<Pick<RateLimitOptions, 'limit' | 'windowMs'>>,
): Promise<RateLimitResult> {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? realIp ?? 'unknown';
  return rateLimit({
    key: `ip:${ip}`,
    limit: options?.limit ?? 100,
    windowMs: options?.windowMs ?? 60 * 1000,
  });
}

export async function rateLimitByUser(
  req: NextRequest,
  options?: Partial<Pick<RateLimitOptions, 'limit' | 'windowMs'>>,
): Promise<RateLimitResult> {
  const userId = req.headers.get('x-user-id') ?? 'anonymous';
  return rateLimit({
    key: `user:${userId}`,
    limit: options?.limit ?? 200,
    windowMs: options?.windowMs ?? 60 * 1000,
  });
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  const status = result.reason ? 503 : 429;

  return NextResponse.json(
    {
      error: result.reason ? 'Security control unavailable' : 'Limite de pedidos excedido',
      retryAfter,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
      },
    },
  );
}

export const RATE_LIMITS = {
  /** API geral: 100 req/min por IP */
  DEFAULT: { limit: 100, windowMs: 60 * 1000 },
  /** Login/registo: 5 req/min por IP */
  AUTH: { limit: 5, windowMs: 60 * 1000 },
  /** Checkout: 10 req/min por IP */
  CHECKOUT: { limit: 10, windowMs: 60 * 1000 },
  /** API pesada (relatórios): 20 req/min por IP */
  HEAVY: { limit: 20, windowMs: 60 * 1000 },
  /** Webhook: limite generoso */
  WEBHOOK: { limit: 200, windowMs: 60 * 1000 },
} as const;
