import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { applyNoStoreHeaders, noStoreJson } from '@/server/security/no-store';
import {
  getAuthCallbackLoginUrl,
  getSafeAuthCallbackNextPathForLocale,
  resolveAuthAppBaseUrl,
} from '@/server/security/auth-callback';

function getLocale(rawLocale: string | null): Locale {
  return rawLocale && locales.includes(rawLocale as Locale) ? rawLocale as Locale : defaultLocale;
}

function noStoreRedirect(url: string | URL) {
  return applyNoStoreHeaders(NextResponse.redirect(url));
}

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appBaseUrl = resolveAuthAppBaseUrl(request.url);
  const locale = getLocale(requestUrl.searchParams.get('locale'));
  const next = getSafeAuthCallbackNextPathForLocale(requestUrl.searchParams.get('next'), locale);

  if (!appBaseUrl) {
    console.warn('google_oauth_app_url_unavailable');
    return noStoreJson({ error: 'auth_app_url_unavailable' }, { status: 503 });
  }

  const callbackUrl = new URL('/auth/callback', appBaseUrl);
  callbackUrl.searchParams.set('next', next);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('google_oauth_configuration_unavailable');
    return noStoreRedirect(getAuthCallbackLoginUrl(appBaseUrl, next, 'auth_configuration_unavailable'));
  }

  const cookiesToSet: CookieToSet[] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookiesToSet) {
        nextCookiesToSet.forEach(({ name, value, options }) => {
          cookiesToSet.push({ name, value, options });
        });
      },
    },
  });

  const signInResult = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (signInResult.error || !signInResult.data.url) {
    console.warn('google_oauth_start_failed');
    return noStoreRedirect(getAuthCallbackLoginUrl(appBaseUrl, next, 'auth_exchange_failed'));
  }

  const redirectResponse = noStoreRedirect(signInResult.data.url);
  cookiesToSet.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options);
  });

  return redirectResponse;
}
