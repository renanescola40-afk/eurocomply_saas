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

const LEGACY_UNDEFINED_ROUTES: Record<string, string> = {
  '/dashboard/organizations/vendors': '/vendor-assurance',
  '/dashboard/organizations/risks': '/riscos',
  '/dashboard/organizations/documents': '/documentos',
  '/dashboard/organizations/tasks': '/aprovacoes',
  '/dashboard/organizations/reports': '/dashboard/organizations/reports-governance',
  '/pricing': '/pricing',
};

function normalizeLegacyUndefinedPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'undefined') {
    const legacyPath = `/${segments.slice(1).join('/')}`;
    return LEGACY_UNDEFINED_ROUTES[legacyPath] ?? `/${segments.slice(1).join('/')}`;
  }

  if (segments.length >= 2 && locales.includes(segments[0] as 'en') && segments[1] === 'undefined') {
    const locale = segments[0];
    const legacyPath = `/${segments.slice(2).join('/')}`;
    const destination = LEGACY_UNDEFINED_ROUTES[legacyPath] ?? `/${segments.slice(2).join('/')}`;
    return `/${locale}${destination === '/' ? '' : destination}`;
  }

  return null;
}

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

async function getAuthState(req: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: req });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { isAuthenticated: false, supabaseResponse };
  }

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

  return {
    isAuthenticated: Boolean(data.user && !error),
    supabaseResponse,
  };
}

function copyAuthCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/next_api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const normalizedLegacyPath = normalizeLegacyUndefinedPath(pathname);
  if (normalizedLegacyPath && normalizedLegacyPath !== pathname) {
    const redirectUrl = new URL(normalizedLegacyPath, req.url);
    redirectUrl.search = req.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    const isPublic = isPublicRoute(pathname, locale);
    const isAuthEntryRoute = pathname === `/${locale}/login` || pathname === `/${locale}/signup`;
    const shouldCheckAuth = !isPublic || isAuthEntryRoute;
    const authState = shouldCheckAuth
      ? await getAuthState(req)
      : { isAuthenticated: false, supabaseResponse: NextResponse.next({ request: req }) };

    if (!authState.isAuthenticated && !isPublic) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('next', pathname);
      const response = NextResponse.redirect(loginUrl);
      copyAuthCookies(authState.supabaseResponse, response);
      return response;
    }

    if (authState.isAuthenticated && isAuthEntryRoute) {
      const dashboardUrl = new URL(`/${locale}${ORGANIZATION_DASHBOARD_PATH}`, req.url);
      const response = NextResponse.redirect(dashboardUrl);
      copyAuthCookies(authState.supabaseResponse, response);
      return response;
    }

    const response = intlMiddleware(req);

    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });

    copyAuthCookies(authState.supabaseResponse, response);

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

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|next_api|.*\\..*).*)'],
};
