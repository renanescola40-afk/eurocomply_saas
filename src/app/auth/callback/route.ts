import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

const DASHBOARD_PATH = '/dashboard/organizations';

function getLocaleFromNextPath(nextPath: string) {
  const firstSegment = nextPath.split('/').filter(Boolean)[0] as Locale | undefined;
  return firstSegment && locales.includes(firstSegment) ? firstSegment : defaultLocale;
}

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext || rawNext === '/' || rawNext.includes('://') || rawNext.startsWith('//')) {
    return `/${defaultLocale}${DASHBOARD_PATH}`;
  }

  const locale = getLocaleFromNextPath(rawNext);

  if (!rawNext.startsWith(`/${locale}/dashboard`)) {
    return `/${locale}${DASHBOARD_PATH}`;
  }

  return rawNext;
}

function getLoginUrl(request: NextRequest, nextPath: string, error: string) {
  const locale = getLocaleFromNextPath(nextPath);
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('error', error);
  loginUrl.searchParams.set('next', nextPath);
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeNextPath(requestUrl.searchParams.get('next'));

  let response = NextResponse.redirect(new URL(next, request.url));

  if (!code) {
    return NextResponse.redirect(getLoginUrl(request, next, 'missing_oauth_code'));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(getLoginUrl(request, next, 'supabase_env_missing'));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(getLoginUrl(request, next, error.message));
  }

  return response;
}
