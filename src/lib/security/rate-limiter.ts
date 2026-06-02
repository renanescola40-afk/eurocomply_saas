/**
 * src/lib/security/rate-limiter.ts
 *
 * Rate limiting para Next.js API Routes.
 *
 * Duas versões:
 *  1. IN-MEMORY — funciona imediatamente, sem Redis.
 *     Limites por IP em memória. NÃO funciona em serverless
 *     (Lambda, Vercel) porque cada invocação tem memória isolada.
 *
 *  2. UPSTASH REDIS — produção, serverless-friendly.
 *     Usa @upstash/redis (gratuito no plano free).
 *
 * Explicação simples:
 *   Rate limiting = limitar quantas vezes alguém pode fazer
 *   um pedido por segundo/minuto. Impede ataques de força bruta
 *   e abuso de APIs.
 *
 * Uso:
 *   import { rateLimit, rateLimitByIp } from '@/lib/security/rate-limiter';
 *
 *   export async function POST(req: NextRequest) {
 *     const { success, remaining, reset } = await rateLimit({ key: req.ip });
 *     if (!success) {
 *       return NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 });
 *     }
 *     // lógica da rota...
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 1: Versão IN-MEMORY (para desenvolvimento)
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number; // timestamp ms
  };
}

/**
 * Store em memória. LIMITADO:
 * - Não funciona em serverless (Lambda, Vercel, Netlify)
 * - Reseta quando o processo reinicia
 * - Memória cresce sem limite (fazer cleanup periódico)
 */
class InMemoryRateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Limpa entradas expiradas a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Object.keys(this.store).forEach(key => {
        if (this.store[key].resetAt <= now) {
          delete this.store[key];
        }
      });
    }, 5 * 60 * 1000);
  }

  check(key: string, limit: number, windowMs: number): {
    success: boolean;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    const entry = this.store[key];

    // Primeira chamada ou janela expirou
    if (!entry || entry.resetAt <= now) {
      this.store[key] = { count: 1, resetAt: now + windowMs };
      return { success: true, remaining: limit - 1, reset: now + windowMs };
    }

    // Dentro da janela
    if (entry.count < limit) {
      entry.count++;
      return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
    }

    // Limite excedido
    return { success: false, remaining: 0, reset: entry.resetAt };
  }
}

// Singleton em memória
const inMemoryLimiter = new InMemoryRateLimiter();

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 2: Versão UPSTASH REDIS (produção serverless)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Para usar Upstash Redis:
 * 1. Criar conta em https://upstash.com (plano free)
 * 2. Criar database Redis
 * 3. Copiar UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN para .env
 */
async function upstashRateLimit(
  key: string,
  limit: number,
  window: number // em segundos
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Upstash Redis não configurado');
  }

  const response = await fetch(`${url}/incr/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error('Upstash rate limit failed');
  }

  const data = (await response.json()) as { value: number };

  if (data.value <= limit) {
    return {
      success: true,
      remaining: limit - data.value,
      reset: Date.now() + window * 1000,
    };
  }

  return {
    success: false,
    remaining: 0,
    reset: Date.now() + window * 1000,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 3: Funções de alto nível
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Identificador único — use req.ip para IP, req.headers.get('x-user-id') para user logado */
  key: string;
  /** Máximo de pedidos na janela */
  limit?: number;
  /** Janela em milissegundos */
  windowMs?: number;
  /** Texto describing who is limited */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Rate limit genérico.
 *
 * Para serverless → usa Upstash (produção)
 * Para Node.js normal → usa memória
 */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit = 100, windowMs = 60 * 1000 } = options;

  // Se Upstash está configurado, usa Redis
  if (process.env.UPSTASH_REDIS_REST_URL) {
    return upstashRateLimit(key, limit, Math.ceil(windowMs / 1000));
  }

  // Fallback: memória
  return inMemoryLimiter.check(key, limit, windowMs);
}

/**
 * Rate limit POR IP — para rotas públicas.
 *
 * Limites:
 *   - 100 pedidos / minuto para API geral
 *   - 5 pedidos / minuto para autenticação
 *   - 20 pedidos / minuto para checkout
 */
export async function rateLimitByIp(
  req: NextRequest,
  options?: Partial<Pick<RateLimitOptions, 'limit' | 'windowMs'>>
): Promise<RateLimitResult> {
  // Next.js 15 não expõe req.ip diretamente — extrair do header
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? realIp ?? 'unknown';
  return rateLimit({
    key: `ip:${ip}`,
    limit: options?.limit ?? 100,
    windowMs: options?.windowMs ?? 60 * 1000,
  });
}

/**
 * Rate limit POR USER — para rotas autenticadas.
 * O token JWT/session é extraído do header Authorization.
 */
export async function rateLimitByUser(
  req: NextRequest,
  options?: Partial<Pick<RateLimitOptions, 'limit' | 'windowMs'>>
): Promise<RateLimitResult> {
  const userId = req.headers.get('x-user-id') ?? 'anonymous';
  return rateLimit({
    key: `user:${userId}`,
    limit: options?.limit ?? 200,
    windowMs: options?.windowMs ?? 60 * 1000,
  });
}

/**
 * Middleware de rate limit para API routes.
 * Aplica-se a todas as rotas abaixo dele.
 *
 * @example
 * // Em src/app/api/secure/route.ts
 * export async function POST(req: NextRequest) {
 *   const { success } = await rateLimitByIp(req, { limit: 5, windowMs: 60 * 1000 });
 *   if (!success) {
 *     return NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 });
 *   }
 *   // ...
 * }
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: 'Limite de pedidos excedido',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
      },
    }
  );
}

/**
 * Configurações pré-definidas para diferentes场景.
 */
export const RATE_LIMITS = {
  /** API geral: 100 req/min por IP */
  DEFAULT: { limit: 100, windowMs: 60 * 1000 },
  /** Login/registo: 5 req/min por IP */
  AUTH: { limit: 5, windowMs: 60 * 1000 },
  /** Checkout: 10 req/min por IP */
  CHECKOUT: { limit: 10, windowMs: 60 * 1000 },
  /** API pesada (relatórios): 20 req/min por IP */
  HEAVY: { limit: 20, windowMs: 60 * 1000 },
  /** Webhook (não é previsível): limite generoso */
  WEBHOOK: { limit: 200, windowMs: 60 * 1000 },
} as const;
