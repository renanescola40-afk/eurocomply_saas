import { NextRequest, NextResponse } from 'next/server';

import { buildPublicProcurementPack } from '@/lib/trust/procurement-pack';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function resolvePublicOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request origin when the configured URL is invalid.
    }
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const pack = buildPublicProcurementPack(resolvePublicOrigin(request));

  return NextResponse.json(pack, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      'Content-Disposition': `inline; filename="risck-comply-procurement-pack-${pack.version}.json"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
