// middleware.ts - Combined i18n + Auth

import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales, defaultLocale, COUNTRY_TO_LOCALE } from '@/lib/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);
const LOCALE_COOKIE = 'NEXT_LOCALE';
const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/register',
  '/auth',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/recuperar-senha',
  '/atualizar-senha',
  '/politica-privacidade',
  '/termos-servico',
];

function isPublicRoute(pathname: string, locale: string): boolean {
  let path = pathname;
  if (locales.includes(locale as 'en') && pathname.startsWith(`/${locale}`)) {
    path = pathname.replace(`/${locale}`, '') || '/';
  }

  return PUBLIC_ROUTES.some(route =>
    path === route ||
    path.startsWith('/auth/') ||
    path.startsWith('/api/auth/')
  );
}

function detectLocale(req: NextRequest): string {
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale as 'en')) {
    return cookieLocale;
  }

  const country =
    req.headers.get('CF-IPCountry') ??
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    '';

  if (country && COUNTRY_TO_LOCALE[country]) {
    return COUNTRY_TO_LOCALE[country];
  }

  const acceptLanguage = req.headers.get('Accept-Language') ?? '';
  const browserLocales = acceptLanguage
    .split(',')
    .map((l) => l.split(';')[0].trim().toLowerCase().replace('_', '-'))
    .filter(Boolean);

  for (const browserLocale of browserLocales) {
    if (locales.includes(browserLocale as 'en')) {
      return browserLocale;
    }
    const base = browserLocale.split('-')[0];
    if (locales.includes(base as 'en')) {
      return base;
    }
  }

  return defaultLocale;
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/next_api') ||
    pathname.startsWith('/zoer_proxy') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request: req });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let isAuthenticated = false;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    isAuthenticated = Boolean(data.user && !error);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    const isPublic = isPublicRoute(pathname, locale);

    if (!isAuthenticated && !isPublic) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthenticated && (pathname === `/${locale}/login` || pathname === `/${locale}/signup`)) {
      const dashboardUrl = new URL(`/${locale}${ORGANIZATION_DASHBOARD_PATH}`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    const response = intlMiddleware(req);

    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
  }

  const detected = detectLocale(req);
  const redirectUrl = new URL(`/${detected}${pathname}`, req.url);
  redirectUrl.search = req.nextUrl.search;

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(LOCALE_COOKIE, detected, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|next_api|zoer_proxy|.*\\..*).*)'],
};
