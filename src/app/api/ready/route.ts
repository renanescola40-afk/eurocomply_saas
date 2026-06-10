import { NextRequest, NextResponse } from 'next/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const token = process.env.HEALTHCHECK_TOKEN;

  if (!token) {
    return process.env.NODE_ENV !== 'production';
  }

  const authorization = request.headers.get('authorization');
  return authorization === `Bearer ${token}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const checks = {
    env: {
      supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    database: {
      adminClient: false,
      subscriptionsReadable: false,
    },
  };

  const supabase = tryCreateAdminClient();
  checks.database.adminClient = Boolean(supabase);

  if (supabase) {
    const { error } = await supabase.from('subscriptions').select('id').limit(1);
    checks.database.subscriptionsReadable = !error;
  }

  const ok = checks.env.supabaseUrl && checks.env.supabaseAnonKey && checks.env.supabaseServiceRole && checks.database.adminClient;

  return NextResponse.json(
    {
      status: ok ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
