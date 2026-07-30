import { NextRequest, NextResponse } from 'next/server';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getSecurityQuestionnairePack, resolveEvidenceUrls } from '@/lib/trust/security-questionnaire';

export const dynamic = 'force-dynamic';

const SECURITY_QUESTIONNAIRE_RATE_LIMIT = 60;
const SECURITY_QUESTIONNAIRE_RATE_LIMIT_WINDOW_MS = 60_000;

function resolveClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export async function GET(request: NextRequest) {
  const rateLimit = await checkDistributedRateLimit({
    key: `public-security-questionnaire:${resolveClientIp(request)}`,
    limit: SECURITY_QUESTIONNAIRE_RATE_LIMIT,
    windowMs: SECURITY_QUESTIONNAIRE_RATE_LIMIT_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const pack = resolveEvidenceUrls(request.nextUrl.origin, getSecurityQuestionnairePack());

  return NextResponse.json(pack, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
