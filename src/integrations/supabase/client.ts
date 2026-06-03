import { createClient } from "@supabase/supabase-js";

// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================
// Priority: NEXT_PUBLIC_SUPABASE_* > NEXT_PUBLIC_DATABASE_* > Fallbacks

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY || "";

const isLikelySupabaseUrl = (url: string) => /\.supabase\.(co|in|app)/.test(url);

const resolvedSupabaseUrlName = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? 'NEXT_PUBLIC_SUPABASE_URL'
  : process.env.NEXT_PUBLIC_DATABASE_URL
  ? 'NEXT_PUBLIC_DATABASE_URL'
  : 'UNSET';

const resolvedSupabaseKeyName = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  : process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY
  ? 'NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY'
  : 'UNSET';

// If the public key or url is missing in the environment (common in misconfigured
// deployments), creating the real Supabase client throws immediately and causes
// noisy console errors like "supabaseKey is required". To avoid that and keep
// the app stable, export a lightweight stub that preserves the API shape used
// by the app and returns friendly errors for calls.
function makeStubClient() {
  const final: any = {};

  const chainable = () => final;

  // Query-like chain that ends with async terminal methods
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
  final.then = undefined; // ensure not treated as a Promise

  final.from = (_: string) => final;

  final.auth = {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ error: new Error('Supabase client not configured') }),
    signUp: async () => ({ error: new Error('Supabase client not configured') }),
    signOut: async () => ({ error: new Error('Supabase client not configured') }),
    resetPasswordForEmail: async () => ({ error: new Error('Supabase client not configured') }),
    signInWithOAuth: async () => ({ error: new Error('Supabase client not configured') }),
  };

  return final;
}

export const supabase = (() => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // Log a single clear warning — developers should configure envs in Vercel
    if (typeof window !== 'undefined') {
      // client-side warning
      console.warn('[supabase] public URL/key not found in environment — returning stub client. Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_DATABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY in Vercel.');
    } else {
      // server-side warning
      console.warn('[supabase] public URL/key not found in environment — server will use supabaseAdmin instead.');
    }
    return makeStubClient() as any;
  }

  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.info(`[supabase] resolved public URL from ${resolvedSupabaseUrlName}: ${SUPABASE_URL}`);
    console.info(`[supabase] resolved public key from ${resolvedSupabaseKeyName}`);
    if (SUPABASE_URL && !isLikelySupabaseUrl(SUPABASE_URL)) {
      console.warn('[supabase] resolved public URL does not look like a Supabase URL. Verify the environment variables and project.');
    }
  }

  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  });
})();
