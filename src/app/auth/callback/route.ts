import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { applyNoStoreHeaders, noStoreJson } from '@/server/security/no-store';
import { resolveAuthAppBaseUrl } from '@/server/security/auth-callback';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ONBOARDING_PATH = '/onboarding';
const LOCALE_COOKIE = 'NEXT_LOCALE';
const CALLBACK_CONTINUATION_PATHS = [
  ONBOARDING_PATH,
  '/checkout',
  '/dashboard/organizations',
  '/dashboard/observability',
] as const;

function getLocaleFromRequest(request: NextRequest): Locale {
  const requestUrl = new URL(request.url);
  const firstPathSegment = requestUrl.pathname.split('/').filter(Boolean)[0];
  const rawLocale = locales.includes(firstPathSegment as Locale)
    ? firstPathSegment
    : requestUrl.searchParams.get('locale') ?? request.cookies.get(LOCALE_COOKIE)?.value;

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

  if (!code) {
    loginUrl.searchParams.set('error', 'missing_oauth_code');
    loginUrl.searchParams.set('next', next);
    return applyNoStoreHeaders(NextResponse.redirect(loginUrl));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn('auth_exchange_failed');
    loginUrl.searchParams.set('error', 'auth_exchange_failed');
    loginUrl.searchParams.set('next', next);
    return applyNoStoreHeaders(NextResponse.redirect(loginUrl));
  }

  return applyNoStoreHeaders(NextResponse.redirect(new URL(next, appBaseUrl)));
}
