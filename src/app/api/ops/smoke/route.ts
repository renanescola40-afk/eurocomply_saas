import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_BUSINESS_MONTHLY',
] as const;

function hasBearerToken(request: Request) {
  const configuredToken = process.env.HEALTHCHECK_TOKEN;

  if (process.env.NODE_ENV !== 'production' && !configuredToken) {
    return true;
  }

  if (!configuredToken) {
    return false;
  }

  const authorization = request.headers.get('authorization');
  return authorization === `Bearer ${configuredToken}`;
}

export async function GET(request: Request) {
  if (!hasBearerToken(request)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const env = requiredEnv.map((name) => ({
    name,
    configured: Boolean(process.env[name]),
  }));

  let supabase = { ok: false, detail: 'not_checked' };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('subscriptions').select('id').limit(1);
    supabase = error ? { ok: false, detail: error.code ?? 'query_failed' } : { ok: true, detail: 'ok' };
  } catch (error) {
    supabase = { ok: false, detail: error instanceof Error ? error.message : 'unknown_error' };
  }

  const missingEnv = env.filter((item) => !item.configured).map((item) => item.name);
  const ok = missingEnv.length === 0 && supabase.ok;

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      env,
      supabase,
      checks: {
        billingConfigured: missingEnv.filter((name) => name.startsWith('STRIPE_')).length === 0,
        supabaseConfigured: missingEnv.filter((name) => name.includes('SUPABASE')).length === 0,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
