import { NextRequest, NextResponse } from 'next/server';

import { checkDistributedRateLimit, getClientIpFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getSecurityQuestionnairePack, resolveEvidenceUrls } from '@/lib/trust/security-questionnaire';

export const dynamic = 'force-dynamic';

const SECURITY_QUESTIONNAIRE_RATE_LIMIT = 60;
const SECURITY_QUESTIONNAIRE_RATE_LIMIT_WINDOW_MS = 60_000;

export async function GET(request: NextRequest) {
  const rateLimit = await checkDistributedRateLimit({
    policy: 'general-api',
    ip: getClientIpFromRequest(request),
    route: request.nextUrl.pathname,
    action: 'read-public-security-questionnaire',
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
