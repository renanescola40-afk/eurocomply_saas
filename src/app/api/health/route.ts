import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
  };

  return noStoreJson(
    {
      service: 'eurocomply-saas',
      status: 'ok',
      checkedAt: new Date().toISOString(),
      checks: { application: 'ok' },
    },
    {
      status: 200,
      headers: securityHeaders,
    },
  );
}
