import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

const DASHBOARD_PATH = '/dashboard/organizations';

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

function getLocale(rawLocale: string | null): Locale {
  return rawLocale && locales.includes(rawLocale as Locale) ? rawLocale as Locale : defaultLocale;
}

function getSafeNextPath(rawNext: string | null, locale: Locale) {
  if (!rawNext || rawNext.includes('://') || rawNext.startsWith('//')) {
    return `/${locale}${DASHBOARD_PATH}`;
  }

  if (!rawNext.startsWith(`/${locale}/dashboard`)) {
    return `/${locale}${DASHBOARD_PATH}`;
  }

  return rawNext;
}

function getLoginUrl(request: NextRequest, locale: Locale, error: string) {
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('error', error);
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const locale = getLocale(requestUrl.searchParams.get('locale'));
  const next = getSafeNextPath(requestUrl.searchParams.get('next'), locale);
  const origin = requestUrl.origin;
  const callbackUrl = new URL('/auth/callback', origin);
  callbackUrl.searchParams.set('next', next);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(getLoginUrl(request, locale, 'Supabase env missing'));
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    const message = error?.message ?? 'Could not start Google login';
    return NextResponse.redirect(getLoginUrl(request, locale, message));
  }

  const redirectResponse = NextResponse.redirect(data.url);
  cookiesToSet.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options);
  });

  return redirectResponse;
}
