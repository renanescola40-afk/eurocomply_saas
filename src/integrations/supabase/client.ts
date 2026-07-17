import { createBrowserClient } from '@supabase/ssr';

// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================
// Public browser config must use explicit Supabase public/publishable env names.
// Database URLs and service-role keys remain server-only.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isLikelySupabaseUrl = (url: string) => /\.supabase\.(co|in|app)/.test(url);

const resolvedSupabaseUrlName = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? 'NEXT_PUBLIC_SUPABASE_URL'
  : 'UNSET';

const resolvedSupabaseKeyName = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  : 'UNSET';

function makeStubClient() {
  const final: any = {};
  const chainable = () => final;

  final.select = chainable;
  final.insert = chainable;
  final.update = chainable;
  final.delete = chainable;
  final.eq = chainable;
  final.neq = chainable;
  final.order = chainable;
  final.limit = chainable;
  final.maybeSingle = async () => ({ data: null, error: new Error('Supabase client not configured') });
  final.single = async () => ({ data: null, error: new Error('Supabase client not configured') });
  final.then = undefined;
  final.from = (_: string) => final;

  final.auth = {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ error: new Error('Supabase client not configured') }),
    signUp: async () => ({ error: new Error('Supabase client not configured') }),
    signOut: async () => ({ error: new Error('Supabase client not configured') }),
    updateUser: async () => ({ data: { user: null }, error: new Error('Supabase client not configured') }),
    resetPasswordForEmail: async () => ({ error: new Error('Supabase client not configured') }),
    signInWithOAuth: async () => ({ error: new Error('Supabase client not configured') }),
  };

  return final;
}

export const supabase = (() => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (typeof window !== 'undefined') {
      console.warn('[supabase] public URL/key not found in environment — returning stub client. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.');
    } else {
      console.warn('[supabase] public URL/key not found in environment — server will use supabaseAdmin instead.');
    }
    return makeStubClient() as any;
  }

  const isLocalBrowser =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  if (isLocalBrowser) {
    console.info(`[supabase] resolved public URL from ${resolvedSupabaseUrlName}: ${SUPABASE_URL}`);
    console.info(`[supabase] resolved public key from ${resolvedSupabaseKeyName}`);
    if (!isLikelySupabaseUrl(SUPABASE_URL)) {
      console.warn('[supabase] resolved public URL does not look like a Supabase URL. Verify the environment variables and project.');
    }
  }

  // Important for OAuth PKCE and password-recovery links in Next.js SSR:
  // createBrowserClient stores the verifier/session in cookies so the localized
  // callback and reset-password routes can complete the exchange safely.
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
})();
