import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return noStoreJson(
    {
      service: 'risck-comply-saas',
      status: 'ok',
      checkedAt: new Date().toISOString(),
      checks: {
        application: 'ok',
      },
    },
    {
      status: 200,
    },
  );
}
