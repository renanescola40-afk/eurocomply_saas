import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type HealthStatus = 'healthy' | 'degraded';

function getCommitSha() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    'unknown'
  );
}

export async function GET() {
  const hasRequiredPublicRuntimeConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const status: HealthStatus = hasRequiredPublicRuntimeConfig ? 'healthy' : 'degraded';

  return NextResponse.json(
    {
      service: 'eurocomply-saas',
      status,
      checkedAt: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      commit: getCommitSha().slice(0, 12),
      checks: {
        application: 'ok',
        requiredRuntimeConfiguration: hasRequiredPublicRuntimeConfig ? 'ok' : 'missing',
      },
    },
    {
      status: status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
