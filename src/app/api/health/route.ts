import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Check = {
  name: string;
  ok: boolean;
  required: boolean;
};

function envCheck(name: string, required = true): Check {
  return { name, ok: Boolean(process.env[name]), required };
}

export async function GET() {
  const checks: Check[] = [
    envCheck('NEXT_PUBLIC_SUPABASE_URL'),
    envCheck('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    envCheck('SUPABASE_SERVICE_ROLE_KEY'),
    envCheck('NEXT_PUBLIC_APP_URL', false),
    envCheck('STRIPE_SECRET_KEY', false),
    envCheck('STRIPE_WEBHOOK_SECRET', false),
    envCheck('SENTRY_AUTH_TOKEN', false),
    envCheck('UPSTASH_REDIS_REST_URL', false),
    envCheck('UPSTASH_REDIS_REST_TOKEN', false),
  ];

  const missingRequired = checks.filter((check) => check.required && !check.ok);
  const status = missingRequired.length === 0 ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: status === 'ok' ? 200 : 503 },
  );
}
