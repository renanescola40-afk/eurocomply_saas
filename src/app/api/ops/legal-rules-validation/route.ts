import { NextRequest, NextResponse } from 'next/server';

import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { buildLegalRulesRuntimeEvidence } from '@/server/ai-governance/legal-rules-runtime';
import { runtimeReleaseMetadata } from '@/server/release/runtime-release-metadata';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE = '/api/ops/legal-rules-validation';
const AUTH_ACTION = 'authenticate_legal_rules_runtime_validation';

function deploymentEnvironment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown';
}

export async function GET(request: NextRequest) {
  const authRateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: AUTH_ACTION,
  });
  if (authRateLimited) return authRateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
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
