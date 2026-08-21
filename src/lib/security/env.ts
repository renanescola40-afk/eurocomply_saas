/** Runtime environment validation for RISCK COMPLY. */

import { z } from 'zod';

const envName = (...parts: string[]) => parts.join('_');

const NEXT_PUBLIC_SUPABASE_URL = envName('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const NEXT_PUBLIC_SUPABASE_ANON_KEY = envName('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const NEXT_PUBLIC_APP_URL = envName('NEXT', 'PUBLIC', 'APP', 'URL');
const STRIPE_SECRET_KEY = envName('STRIPE', 'SECRET', 'KEY');
const STRIPE_WEBHOOK_SECRET = envName('STRIPE', 'WEBHOOK', 'SECRET');
const STRIPE_PRICE_ESSENTIAL_MONTHLY = envName('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY');
const STRIPE_PRICE_ESSENTIAL_ANNUAL = envName('STRIPE', 'PRICE', 'ESSENTIAL', 'ANNUAL');
const STRIPE_PRICE_PROFESSIONAL_MONTHLY = envName('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY');
const STRIPE_PRICE_PROFESSIONAL_ANNUAL = envName('STRIPE', 'PRICE', 'PROFESSIONAL', 'ANNUAL');
const AUTH_SECRET = envName('AUTH', 'SECRET');
const UPSTASH_REDIS_REST_URL = envName('UPSTASH', 'REDIS', 'REST', 'URL');
const UPSTASH_REDIS_REST_TOKEN = envName('UPSTASH', 'REDIS', 'REST', 'TOKEN');

const DEFAULT_DEV_AUTH_SECRET = 'dev-secret-min-32-chars-please-change';

const canonicalStripePrice = (name: string) => z.string().trim().startsWith('price_', `${name} deve começar com price_`);

const envSchema = z.object({
  [NEXT_PUBLIC_SUPABASE_URL]: z.string().url(`${NEXT_PUBLIC_SUPABASE_URL} deve ser uma URL válida`),
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]: z.string().min(1, `${NEXT_PUBLIC_SUPABASE_ANON_KEY} não pode estar vazio`),
  [STRIPE_SECRET_KEY]: z.string().startsWith('sk_', `${STRIPE_SECRET_KEY} deve começar com sk_`),
  [STRIPE_WEBHOOK_SECRET]: z.string().startsWith('whsec_', `${STRIPE_WEBHOOK_SECRET} deve começar com whsec_`),
  [STRIPE_PRICE_ESSENTIAL_MONTHLY]: canonicalStripePrice(STRIPE_PRICE_ESSENTIAL_MONTHLY),
  [STRIPE_PRICE_ESSENTIAL_ANNUAL]: canonicalStripePrice(STRIPE_PRICE_ESSENTIAL_ANNUAL),
  [STRIPE_PRICE_PROFESSIONAL_MONTHLY]: canonicalStripePrice(STRIPE_PRICE_PROFESSIONAL_MONTHLY),
  [STRIPE_PRICE_PROFESSIONAL_ANNUAL]: canonicalStripePrice(STRIPE_PRICE_PROFESSIONAL_ANNUAL),
  [NEXT_PUBLIC_APP_URL]: z.string().url(`${NEXT_PUBLIC_APP_URL} deve ser uma URL`),
  [AUTH_SECRET]: z.string().min(32, `${AUTH_SECRET} deve ter pelo menos 32 caracteres`).optional().default(DEFAULT_DEV_AUTH_SECRET),
  [UPSTASH_REDIS_REST_URL]: z.string().url().optional(),
  [UPSTASH_REDIS_REST_TOKEN]: z.string().optional(),
});

const resolvedEnv = {
  ...process.env,
  [NEXT_PUBLIC_SUPABASE_URL]:
    process.env[NEXT_PUBLIC_SUPABASE_URL] ||
    process.env.SUPABASE_URL ||
    '',
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]:
    process.env[NEXT_PUBLIC_SUPABASE_ANON_KEY] ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '',
};

export const env = (() => {
  const result = envSchema.safeParse(resolvedEnv);

  if (!result.success) {
    const errors = result.error.issues
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    const message = [
      'ERRO DE CONFIGURAÇÃO — VARIÁVEIS DE AMBIENTE FALTANDO',
      errors,
      'Valores reais devem ficar nos provider secret stores; use .env.example apenas como inventário sem valores reais.',
    ].join('\n');

    if (process.env.NODE_ENV === 'production') throw new Error(message);

    console.error(message);
    return {} as z.infer<typeof envSchema>;
  }

  if (process.env.NODE_ENV === 'production' && result.data[AUTH_SECRET] === DEFAULT_DEV_AUTH_SECRET) {
    throw new Error(`${AUTH_SECRET} é obrigatório em produção e não pode usar o fallback de desenvolvimento.`);
  }

  console.log('[ENV] Variáveis de ambiente validadas com sucesso');
  return result.data;
})();

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isPreview = process.env.VERCEL_ENV === 'preview';

export function generateEnvExample(): string {
  return [
    '# RISCK COMPLY — Variáveis de Ambiente',
    '# Consulte .env.example na raiz do repositório para o inventário completo.',
    '# Não gere nem cole valores reais neste output.',
    `${NEXT_PUBLIC_SUPABASE_URL}=https://xxxxx.supabase.co`,
    `${NEXT_PUBLIC_SUPABASE_ANON_KEY}=redacted-example`,
    `${NEXT_PUBLIC_APP_URL}=https://app.risckcomply.com`,
  ].join('\n');
}
