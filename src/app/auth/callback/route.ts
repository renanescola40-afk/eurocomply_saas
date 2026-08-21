import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { applyNoStoreHeaders, noStoreJson } from '@/server/security/no-store';
import { resolveAuthAppBaseUrl } from '@/server/security/auth-callback';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  extractSupabaseSsoProviderId,
  provisionEnterpriseSsoSession,
} from '@/server/enterprise/sso';

const ONBOARDING_PATH = '/onboarding';
const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations';
const LOCALE_COOKIE = 'NEXT_LOCALE';
const CALLBACK_CONTINUATION_PATHS = [
  ONBOARDING_PATH,
  '/checkout',
  ORGANIZATION_DASHBOARD_PATH,
  '/dashboard/observability',
] as const;

type SupabaseClaimsApi = {
  getClaims?: () => Promise<{
    data?: { claims?: Record<string, unknown> | null } | null;
    error?: { message?: string } | null;
  }>;
};

function getLocaleFromRequest(request: NextRequest): Locale {
  const requestUrl = new URL(request.url);
  const queryLocale = requestUrl.searchParams.get('locale');

  // OAuth begins at the unlocalized callback URL. Locale middleware may add a
  // detected path prefix before this handler runs, so the explicit allowlisted
  // locale emitted by our own OAuth initiation flow must win over that prefix.
  if (queryLocale && locales.includes(queryLocale as Locale)) {
    return queryLocale as Locale;
  }

  const firstPathSegment = requestUrl.pathname.split('/').filter(Boolean)[0];
  const rawLocale = locales.includes(firstPathSegment as Locale)
    ? firstPathSegment
    : request.cookies.get(LOCALE_COOKIE)?.value;

  return rawLocale && locales.includes(rawLocale as Locale) ? rawLocale as Locale : defaultLocale;
}

function isAllowedCallbackContinuation(path: string, locale: Locale) {
  return CALLBACK_CONTINUATION_PATHS.some((allowedPath) => {
    const localizedPath = `/${locale}${allowedPath}`;
    return path === localizedPath || path.startsWith(`${localizedPath}/`) || path.startsWith(`${localizedPath}?`);
  });
}

function getSafeNextPath(rawNext: string | null, locale: Locale) {
  const fallback = `/${locale}${ONBOARDING_PATH}`;
  const normalizedNext = rawNext?.trim();

  if (!normalizedNext || normalizedNext.length > 240 || normalizedNext.startsWith('//') || normalizedNext.includes('://')) {
    return fallback;
  }

  return isAllowedCallbackContinuation(normalizedNext, locale) ? normalizedNext : fallback;
}

function redirectToLogin(input: { loginUrl: URL; error: string; next: string }) {
  input.loginUrl.searchParams.set('error', input.error);
  input.loginUrl.searchParams.set('next', input.next);
  return applyNoStoreHeaders(NextResponse.redirect(input.loginUrl));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appBaseUrl = resolveAuthAppBaseUrl(request.url);

  if (!appBaseUrl) {
    console.warn('auth_app_url_unavailable');
    return noStoreJson({ error: 'auth_app_url_unavailable' }, { status: 503 });
  }

  const locale = getLocaleFromRequest(request);
  const next = getSafeNextPath(requestUrl.searchParams.get('next'), locale);
  const code = requestUrl.searchParams.get('code');
  const loginUrl = new URL(`/${locale}/login`, appBaseUrl);

  if (!code || code.length > 2048 || !/^[A-Za-z0-9._~-]+$/.test(code)) {
    return redirectToLogin({ loginUrl, error: 'missing_oauth_code', next });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn('auth_exchange_failed');
    return redirectToLogin({ loginUrl, error: 'auth_exchange_failed', next });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) {
    await supabase.auth.signOut().catch(() => undefined);
    return redirectToLogin({ loginUrl, error: 'auth_exchange_failed', next });
  }

  const claimsApi = supabase.auth as unknown as SupabaseClaimsApi;
  const claimsResult = claimsApi.getClaims
    ? await claimsApi.getClaims().catch(() => null)
    : null;
  const providerId = extractSupabaseSsoProviderId(claimsResult?.data?.claims);

  if (providerId) {
    const email = user.email?.trim().toLowerCase() ?? '';
    if (!email || claimsResult?.error) {
      await supabase.auth.signOut().catch(() => undefined);
      return redirectToLogin({ loginUrl, error: 'enterprise_sso_unavailable', next });
    }

    const provisioning = await provisionEnterpriseSsoSession({
      userId: user.id,
      email,
      providerId,
    });

    if (!provisioning.ok) {
      await supabase.auth.signOut().catch(() => undefined);
      return redirectToLogin({ loginUrl, error: provisioning.code, next });
    }

    const ssoNext = requestUrl.searchParams.has('next')
      ? next
      : `/${locale}${ORGANIZATION_DASHBOARD_PATH}`;
    return applyNoStoreHeaders(NextResponse.redirect(new URL(ssoNext, appBaseUrl)));
  }

  return applyNoStoreHeaders(NextResponse.redirect(new URL(next, appBaseUrl)));
}
