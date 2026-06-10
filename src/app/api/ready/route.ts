import { NextResponse } from 'next/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
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
