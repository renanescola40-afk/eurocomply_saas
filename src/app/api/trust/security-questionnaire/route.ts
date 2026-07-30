import { NextRequest, NextResponse } from 'next/server';

import { getSecurityQuestionnairePack, resolveEvidenceUrls } from '@/lib/trust/security-questionnaire';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const pack = resolveEvidenceUrls(request.nextUrl.origin, getSecurityQuestionnairePack());

  return NextResponse.json(pack, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
