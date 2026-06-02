/**
 * stripe-types-example.ts
 *
 * Exemplo concreto de tipagem incremental para a rota crítica
 * de checkout (/next_api/stripe/checkout).
 *
 * Mostra como tipar:
 *  - Parâmetros da requisição
 *  - Resposta da API
 *  - Modelo de utilizador/assinatura
 *  - Retorno da função de banco de dados
 *
 * Copie este padrão para tipar outras rotas e serviços.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Tipos do banco de dados (Supabase)
// ─────────────────────────────────────────────────────────────────────────────

/** Perfil do utilizador — lido do Supabase */
export interface DbProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  preferred_language: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Membro ativo de um workspace */
export interface DbWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string | null;
  role: 'owner' | 'admin' | 'member' | null;
  status: 'active' | 'invited' | 'removed' | null;
  invited_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Workspace */
export interface DbWorkspace {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  logo_url: string | null;
  brand_color: string | null;
  readiness_score: number | null;
  plan: 'starter' | 'growth' | 'enterprise' | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

/** Resultado tipado do Supabase — padrão que volta do .maybeSingle() */
export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

export interface DbError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tipos da requisição e resposta da API
// ─────────────────────────────────────────────────────────────────────────────

/** Body do POST /next_api/stripe/checkout */
export interface CheckoutRequestBody {
  plan: Plan;
  workspaceId?: string;
}

/** Planos disponíveis */
export type Plan = 'starter' | 'growth' | 'enterprise';

/** Resposta de sucesso do checkout */
export interface CheckoutSuccessResponse {
  url: string;
  sessionId: string;
}

/** Resposta de erro da API */
export interface CheckoutErrorResponse {
  error: string;
  details?: string;
}

/** Resposta union — ou sucesso ou erro */
export type CheckoutResponse = CheckoutSuccessResponse | CheckoutErrorResponse;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tipos do Stripe
// ─────────────────────────────────────────────────────────────────────────────

/** Sessão de checkout do Stripe */
export interface StripeCheckoutSession {
  id: string;
  object: 'checkout.session';
  mode: 'payment' | 'subscription' | 'setup';
  customer: string | null;
  customer_email: string | null;
  metadata: StripeSessionMetadata | null;
  subscription: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'complete' | 'expired' | 'open';
  url: string | null;
  created: number;
  livemode: boolean;
}

/** Metadata que gravamos na sessão de checkout */
export interface StripeSessionMetadata {
  userId: string;
  workspaceId: string;
  plan: Plan;
}

/** Subscrição do Stripe */
export interface StripeSubscription {
  id: string;
  object: 'subscription';
  status: StripeSubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    data: StripeSubscriptionItem[];
  };
  latest_invoice: string | null;
}

export type StripeSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface StripeSubscriptionItem {
  id: string;
  price: {
    id: string;
    unit_amount: number | null;
    currency: string;
    recurring: {
      interval: 'month' | 'year';
    } | null;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Tipo da sessão de autenticação (Supabase)
// ─────────────────────────────────────────────────────────────────────────────

/** Sessão do Supabase Auth */
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: 'bearer';
  user: SupabaseUser;
}

export interface SupabaseUser {
  id: string;
  email: string;
  role: string;
  aud: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Função de banco de dados tipada — exemplo de uso
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exemplo de função helper com tipos corretos.
 * Este padrão deve ser usado em todos os acessos ao Supabase.
 *
 * NOTA: O Supabase SDK para Next.js (com server/instrumentation)
 * deve ser usado via @/integrations/supabase/server — não diretamente.
 * Esta função serve como DOCUMENTAÇÃO do padrão de tipagem.
 */
export async function getActiveWorkspaceMember(
  userId: string,
  workspaceId?: string
): Promise<DbResult<DbWorkspaceMember>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { supabaseAdmin } = require('@/integrations/supabase/server');

  let query = supabaseAdmin
    .from('workspace_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as DbWorkspaceMember, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Hook useAuth tipado
// ─────────────────────────────────────────────────────────────────────────────

export interface UseAuthReturn {
  user: import('@supabase/supabase-js').User | null;
  session: SupabaseSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Preço por plano
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_PRICES: Record<Plan, { priceId: string; label: string; priceEur: number }> = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? 'price_starter_placeholder',
    label: 'Starter',
    priceEur: 49,
  },
  growth: {
    priceId: process.env.STRIPE_GROWTH_PRICE_ID ?? 'price_growth_placeholder',
    label: 'Growth',
    priceEur: 199,
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? 'price_enterprise_placeholder',
    label: 'Enterprise',
    priceEur: 799,
  },
};

export const VALID_PLANS: Plan[] = ['starter', 'growth', 'enterprise'];

export function isValidPlan(plan: unknown): plan is Plan {
  return VALID_PLANS.includes(plan as Plan);
}
