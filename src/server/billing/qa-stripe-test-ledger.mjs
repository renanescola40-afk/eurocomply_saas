// QA-only Stripe TEST intake boundary. Not an entitlement writer and not a webhook admission switch.
// This module is intentionally NOT called from the public webhook routes until a qualified
// security review, approved deployment and signed-provider persistence replay exist.
const QA_SUPABASE_URL = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
const QA_WRITER_ROLE = 'risck_qa_stripe_event_writer';
const QA_REF = 'zrxrrfbllsxtleyxjpsz';
const MAX_TOKEN_LIFETIME_SECONDS = 3600;
const FORBIDDEN_QA_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ADMIN_KEY',
  'SUPABASE_SECRET_KEY', 'DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL',
  'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING',
];
const SUPPORTED_TEST_TYPES = new Set([
  'checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'customer.subscription.created', 'customer.subscription.updated',
  'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed',
]);

function exactQaUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname === QA_REF + '.supabase.co' &&
      !url.username && !url.password && !url.port &&
      (url.pathname === '' || url.pathname === '/') && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function decodeJwtClaims(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof header !== 'object' || !header || !['RS256', 'ES256', 'HS256'].includes(header.alg)) return null;
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

// This is only a fail-closed preflight. Supabase/PostgREST MUST verify the JWT signature.
// Decoding unverified claims here never authorizes billing, customer access or entitlements.
export function inspectQaStripeTestLedgerConfig(env, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (env.RISCK_QA_ENVIRONMENT !== 'true' || env.VERCEL_ENV !== 'preview' ||
      env.VERCEL_TARGET_ENV === 'production') return { ready: false, reason: 'qa_scope_invalid' };
  if (!exactQaUrl(env.NEXT_PUBLIC_SUPABASE_URL) ||
      !exactQaUrl(env.SUPABASE_URL)) return { ready: false, reason: 'qa_database_identity_invalid' };
  if (FORBIDDEN_QA_SECRETS.some((key) => Boolean(env[key]))) {
    return { ready: false, reason: 'qa_privileged_secret_forbidden' };
  }
  if (typeof env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'string' || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ready: false, reason: 'qa_publishable_key_missing' };
  }
  if (!String(env.STRIPE_SECRET_KEY || '').startsWith('sk_test_') ||
      !String(env.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_')) {
    return { ready: false, reason: 'stripe_test_binding_invalid' };
  }
  const claims = decodeJwtClaims(env.RISCK_QA_STRIPE_LEDGER_JWT);
  if (!claims || claims.role !== QA_WRITER_ROLE || claims.qa_project_ref !== QA_REF ||
      claims.livemode !== false || !Number.isSafeInteger(claims.iat) ||
      !Number.isSafeInteger(claims.exp) || claims.iat > nowSeconds ||
      claims.exp <= nowSeconds || claims.exp <= claims.iat ||
      claims.exp - claims.iat > MAX_TOKEN_LIFETIME_SECONDS) {
    return { ready: false, reason: 'qa_restricted_jwt_invalid' };
  }
  return { ready: true, reason: 'qa_scoped_test_ledger_only' };
}

function validateSignedTestEvent(event) {
  if (!event || typeof event !== 'object' || event.livemode !== false ||
      typeof event.id !== 'string' || !/^evt_[a-zA-Z0-9_]{4,200}$/.test(event.id) ||
      !SUPPORTED_TEST_TYPES.has(event.type) ||
      !Number.isSafeInteger(event.created) || event.created <= 0 ||
      !event.data || typeof event.data !== 'object') {
    throw new Error('qa_stripe_event_rejected');
  }
}

/**
 * Explicitly verifies the provider signature before storing an unbound TEST event.
 * This records an intake claim ONLY: it NEVER changes subscriptions or entitlements.
 * A caller must not acknowledge successful fulfillment based on this result.
 * Optional implementations allow deterministic local tests; public routes never supply them.
 */
export async function recordSignedQaStripeTestEvent({ rawBody, signature }, {
  env = process.env,
  nowSeconds = Math.floor(Date.now() / 1000),
  verifyStripeEvent,
  createClientImpl,
} = {}) {
  const scope = inspectQaStripeTestLedgerConfig(env, nowSeconds);
  if (!scope.ready) throw new Error('qa_stripe_writer_unavailable');
  if (typeof rawBody !== 'string' || Buffer.byteLength(rawBody, 'utf8') > 1_000_000 ||
      !signature || typeof signature !== 'string') throw new Error('qa_stripe_signature_missing');

  // Production code always obtains Stripe verification from the locally pinned SDK.
  if ((verifyStripeEvent || createClientImpl) && env.NODE_ENV !== 'test') {
    throw new Error('qa_stripe_test_override_forbidden');
  }
  let verifier = verifyStripeEvent;
  if (!verifier) {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    verifier = (body, header, secret) => stripe.webhooks.constructEvent(body, header, secret, 300);
  }
  let event;
  try { event = verifier(rawBody, signature, env.STRIPE_WEBHOOK_SECRET); }
  catch { throw new Error('qa_stripe_signature_invalid'); }
  validateSignedTestEvent(event);

  const createClient = createClientImpl || (await import('@supabase/supabase-js')).createClient;
  const client = createClient(QA_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    accessToken: async () => env.RISCK_QA_STRIPE_LEDGER_JWT,
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.from('stripe_events_processed').insert({
    id: event.id,
    type: event.type,
    status: 'processing',
    stripe_created_at: new Date(event.created * 1000).toISOString(),
    livemode: false,
    api_version: event.api_version ?? null,
    // Intentionally do not store raw customer data or user-provided organization_id.
    payload: { event_id: event.id, event_type: event.type, qa_intake_only: true },
  });
  if (error?.code === '23505') {
    const { data, error: lookupError } = await client.from('stripe_events_processed')
      .select('id,status').eq('id', event.id).maybeSingle();
    if (lookupError || !data) throw new Error('qa_stripe_writer_duplicate_unreadable');
    return { recorded: false, duplicate: true, status: data.status };
  }
  if (error) throw new Error('qa_stripe_writer_database_rejected');
  return { recorded: true, duplicate: false, status: 'processing' };
}
