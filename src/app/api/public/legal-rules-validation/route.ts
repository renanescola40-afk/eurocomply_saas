import { NextRequest, NextResponse } from 'next/server';

import { checkDistributedRateLimit, getClientIpFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { buildLegalRulesRuntimeEvidence } from '@/server/ai-governance/legal-rules-runtime';
import { runtimeReleaseMetadata } from '@/server/release/runtime-release-metadata';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LEGAL_RULES_VALIDATION_RATE_LIMIT = 30;
const LEGAL_RULES_VALIDATION_WINDOW_MS = 60_000;

function deploymentEnvironment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown';
}

export async function GET(request: NextRequest) {
  const rateLimit = await checkDistributedRateLimit({
    policy: 'general-api',
    ip: getClientIpFromRequest(request),
    route: request.nextUrl.pathname,
    action: 'read-public-legal-rules-validation',
    limit: LEGAL_RULES_VALIDATION_RATE_LIMIT,
    windowMs: LEGAL_RULES_VALIDATION_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const release = runtimeReleaseMetadata();
  const evidence = buildLegalRulesRuntimeEvidence({
    environment: deploymentEnvironment(),
    deploymentUrl: request.nextUrl.origin,
    deploymentSha: release.commitSha ?? 'unknown',
    requestId: request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id'),
  });

  return NextResponse.json(evidence, {
    status: evidence.status === 'PASS' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
