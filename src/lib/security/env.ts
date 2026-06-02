/**
 * src/lib/security/env.ts
 *
 * Validação de variáveis de ambiente com Zod.
 * Garante que a app NÃO inicia se faltarem envs críticas.
 *
 * Explicação simples:
 *   Sem este ficheiro, se faltasse uma variável como
 *   STRIPE_SECRET_KEY, o app arrancava e só falhava
 *   quando o utilizador tentava pagar.
 *   Com Zod, o app morre na inicialização com uma
 *   mensagem clara do que falta.
 *
 * Uso:
 *   import { env, isProduction } from '@/lib/security/env';
 *
 *   // Em qualquer sitio:
 *   const stripe = new Stripe(env.STRIPE_SECRET_KEY);
 *
 *   // Para verificar se está em produção:
 *   if (isProduction) { ... }
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Esquema de validação — define TODAS as envs esperadas
// ─────────────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // ── Supabase ──────────────────────────────────────────────────────────
  NEXT_PUBLIC_DATABASE_URL: z.string().url('NEXT_PUBLIC_DATABASE_URL deve ser uma URL válida'),
  NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY não pode estar vazio'),

  // ── Stripe ─────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith('sk_', 'STRIPE_SECRET_KEY deve começar com sk_'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET deve começar com whsec_'),
  STRIPE_STARTER_PRICE_ID: z.string().min(1, 'STRIPE_STARTER_PRICE_ID é obrigatório'),
  STRIPE_GROWTH_PRICE_ID: z.string().min(1, 'STRIPE_GROWTH_PRICE_ID é obrigatório'),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().min(1, 'STRIPE_ENTERPRISE_PRICE_ID é obrigatório'),

  // ── App ────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL deve ser uma URL'),

  // ── Segurança (opcionais mas recomendadas) ────────────────────────────
  /** Chave secreta para signed URLs, cookies, etc. Min 32 chars */
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET deve ter pelo menos 32 caracteres')
    .optional()
    .default('dev-secret-min-32-chars-please-change'),

  /** Para Upstash Redis rate limiting (opcional) */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Parsing — acontece SÓ uma vez, na primeira vez que se importa este módulo
// ─────────────────────────────────────────────────────────────────────────────

/** O objeto parsed. Accessível em toda a app como: env.STRIPE_SECRET_KEY */
export const env = (() => {
  // Tenta fazer parse; se falhar, a app morre com erro claro
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    const message = `
╔══════════════════════════════════════════════════════════════╗
║  ERRO DE CONFIGURAÇÃO — VARIÁVEIS DE AMBIENTE FALTANDO      ║
╠══════════════════════════════════════════════════════════════╣
${errors}
╠══════════════════════════════════════════════════════════════╣
║  VERIFIQUE O FICHEIRO .env NA RAIZ DO PROJETO               ║
║  COPIE .env.example PARA .env E PREENCHA OS VALORES        ║
╚══════════════════════════════════════════════════════════════╝`;

    // Em desenvolvimento mostra no console; em produção morre
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.error(message);
      // Em dev, retorna objecto vazio para a app não crashar durante o desenvolvimento
      return {} as z.infer<typeof envSchema>;
    }
  }

  console.log('[ENV] Variáveis de ambiente validadas com sucesso');
  return result.data;
})();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** true se estiver em ambiente de produção */
export const isProduction = process.env.NODE_ENV === 'production';

/** true se estiver em ambiente de desenvolvimento */
export const isDevelopment = process.env.NODE_ENV === 'development';

/** true se estiver em staging/preview */
export const isPreview = process.env.VERCEL_ENV === 'preview';

/**
 * Gera um .env.example com TODAS as variáveis documentadas.
 * Copie o output para .env.example.
 */
export function generateEnvExample(): string {
  return `# ─────────────────────────────────────────────────────────────────
# EuroComply AI — Variáveis de Ambiente
# Copie para .env e preencha os valores
# ─────────────────────────────────────────────────────────────────

# ── Supabase ──────────────────────────────────────────────────────
# URL do projeto Supabase (encontra-se em Settings > API)
NEXT_PUBLIC_DATABASE_URL=https://xxxxx.supabase.co

# Chave publishable do Supabase ( pública — não é sensível)
NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY=eyJhbGc...

# ── Stripe ────────────────────────────────────────────────────────
# Chave secreta (não mostre no frontend)
STRIPE_SECRET_KEY=sk_live_...

# Segredo do webhook (Configurar no dashboard Stripe > Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# IDs dos preços criados no Stripe Dashboard
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# URL pública da aplicação (sem trailing slash)
NEXT_PUBLIC_APP_URL=https://app.eurocomply.ai

# ── Segurança ─────────────────────────────────────────────────────
# Para produção: gere com: openssl rand -base64 32
AUTH_SECRET=sua-chave-super-secreta-com-mais-de-32-caracteres

# ── Rate Limiting (opcional — Upstash Redis) ───────────────────────
# Só é necessário se usar rate limiting por IP em produção serverless
# Crie conta gratuita em https://upstash.com
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
`;
}
