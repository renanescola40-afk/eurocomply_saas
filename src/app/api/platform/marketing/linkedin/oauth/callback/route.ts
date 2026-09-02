import { NextRequest, NextResponse } from 'next/server';

import {
  inspectLinkedInAccessToken,
} from '@/lib/marketing/linkedin-connection';
import { storeLinkedInOAuthTokens } from '@/lib/marketing/linkedin-credentials';
import {
  exchangeLinkedInAuthorizationCode,
  getLinkedInOAuthConfig,
  LINKEDIN_OAUTH_STATE_COOKIE,
  linkedInOAuthStateMatches,
} from '@/lib/marketing/linkedin-oauth';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const runtime = 'nodejs';

const ROUTE = '/api/platform/marketing/linkedin/oauth/callback';

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function oauthOutcomeRedirect(request: NextRequest, outcome: string) {
  const target = new URL('/pt/platform', request.url);
  target.searchParams.set('linkedin', outcome);
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.cookies.set({
    name: LINKEDIN_OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const rateLimit = await checkDistributedRateLimit({
      key: `platform-linkedin-oauth-callback:${user.id}:${getClientIp(request)}`,
      policy: 'general-api',
      userId: user.id,
      organizationId: null,
      route: ROUTE,
      action: 'linkedin_marketing.oauth_callback',
      limit: 8,
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

    const state = request.nextUrl.searchParams.get('state');
    const expectedState = request.cookies.get(LINKEDIN_OAUTH_STATE_COOKIE)?.value ?? null;
    if (!linkedInOAuthStateMatches(state, expectedState)) {
      return oauthOutcomeRedirect(request, 'oauth_state_invalid');
    }

    if (request.nextUrl.searchParams.has('error')) {
      return oauthOutcomeRedirect(request, 'oauth_denied');
    }

    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return oauthOutcomeRedirect(request, 'oauth_code_missing');
    }

    const exchange = await exchangeLinkedInAuthorizationCode(code);
    const config = getLinkedInOAuthConfig();
    const inspection = await inspectLinkedInAccessToken(
      exchange.accessToken,
      config.clientId,
      config.clientSecret,
    );

    if (!inspection.checked || !inspection.active || !inspection.hasRequiredScopes) {
      return oauthOutcomeRedirect(request, 'oauth_scope_invalid');
    }

    await storeLinkedInOAuthTokens({
      accessToken: exchange.accessToken,
      accessTokenExpiresIn: exchange.expiresIn,
      refreshToken: exchange.refreshToken,
      refreshTokenExpiresIn: exchange.refreshTokenExpiresIn,
      scopes: inspection.scopes.length > 0 ? inspection.scopes : exchange.scopes,
    });

    return oauthOutcomeRedirect(request, 'oauth_saved');
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
