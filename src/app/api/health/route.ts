import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return noStoreJson(
    { status: 'ok' },
    {
      status: 200,
      headers: {
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
