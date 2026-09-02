import { NextRequest, NextResponse } from 'next/server';

import {
  buildLinkedInAuthorizationUrl,
  createLinkedInOAuthState,
  LINKEDIN_OAUTH_STATE_COOKIE,
  LINKEDIN_OAUTH_STATE_MAX_AGE_SECONDS,
} from '@/lib/marketing/linkedin-oauth';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const runtime = 'nodejs';

const ROUTE = '/api/platform/marketing/linkedin/oauth/start';

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function trustedInitiation(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function hardenRedirect(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export async function GET(request: NextRequest) {
  try {
    if (!trustedInitiation(request)) {
      return noStoreJson({ error: 'untrusted_oauth_initiation' }, { status: 403 });
    }

    const user = await requireApiUser();
    const rateLimit = await checkDistributedRateLimit({
      key: `platform-linkedin-oauth-start:${user.id}:${getClientIp(request)}`,
      policy: 'general-api',
      userId: user.id,
      organizationId: null,
      route: ROUTE,
      action: 'linkedin_marketing.oauth_start',
      limit: 5,
      windowMs: 10 * 60_000,
      failureMode: 'fail-closed',
    });

    if (!rateLimit.allowed) {
      return noStoreJson(
        { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' },
        { status: rateLimit.reason ? 503 : 429 },
      );
    }

    await requirePlatformCapability(user.id, 'security');

    const state = createLinkedInOAuthState();
    const authorizationUrl = buildLinkedInAuthorizationUrl(state);
    const response = hardenRedirect(NextResponse.redirect(authorizationUrl, { status: 302 }));
    response.cookies.set({
      name: LINKEDIN_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: LINKEDIN_OAUTH_STATE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
