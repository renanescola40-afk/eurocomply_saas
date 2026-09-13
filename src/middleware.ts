// middleware.ts - Combined i18n + Supabase Auth
// getSupabaseUserId invariant: hasSupabaseSession is the active Supabase user guard.

import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales, defaultLocale, COUNTRY_TO_LOCALE } from '@/lib/i18n/routing';
import {
  attachRequestIdHeader,
  buildCorrelatedRequestHeaders,
  createTrustedRequestId,
} from '@/lib/observability/request-correlation';

const intlMiddleware = createIntlMiddleware(routing);
const LOCALE_COOKIE = 'NEXT_LOCALE';
const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations';
const AUTH_SUCCESS_PATH = '/onboarding';
const SENTRY_TUNNEL_PATH = '/monitoring';
const BEAGLE_DOMAIN_VERIFICATION_PATH = '/_e8f1hq2qpr6fuvd036hr4l97yn8octew';
const INTERNAL_PATHNAME_HEADER = 'x-risck-internal-pathname';
const PREMIUM_NEWS_PATH = '/dashboard/organizations/reports-governance/news';
const CHECKOUT_PLAN_IDS = new Set(['starter', 'growth', 'enterprise', 'essential', 'professional', 'business', 'basic', 'pro']);
const AUTH_ENTRY_ROUTES = new Set(['/login', '/signup', '/register']);

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/register',
  '/auth',
  '/oauth/complete',
  '/pricing',
  '/enterprise',
  '/checkout',
  '/resources',
  '/tools',
  '/faq',
  '/about',
  '/contact',
  '/book-demo',
  '/recuperar-senha',
  '/reset-password',
  '/atualizar-senha',
  '/trust',
  '/trust/procurement-pack',
  '/trust/security-questionnaire',
  '/security',
  '/compliance',
  '/data-processing',
  '/sla',
  '/privacy',
  '/terms',
  '/cookie-policy',
  '/acceptable-use',
  '/transfers',
  '/dpa',
  '/subprocessors',
  '/status',
  '/vulnerability-disclosure',
  '/politica-privacidade',
  '/termos-servico',
];

const PUBLIC_ROUTE_PREFIXES = ['/features/', '/tools/'] as const;

const LEGACY_UNDEFINED_ROUTES: Record<string, string> = {
  '/dashboard/organizations/vendors': '/vendor-assurance',
  '/dashboard/organizations/risks': '/dashboard/organizations/risks',
  '/dashboard/organizations/documents': '/dashboard/organizations/documents',
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

function stripLocale(pathname: string, locale: string): string {
  if (locales.includes(locale as 'en') && pathname.startsWith(`/${locale}`)) {
    return pathname.replace(`/${locale}`, '') || '/';
  }

  return pathname;
}

function isPublicRoute(pathname: string, locale: string): boolean {
  const path = stripLocale(pathname, locale);

  return (
    PUBLIC_ROUTES.includes(path) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix)) ||
    path.startsWith('/auth/') ||
    path.startsWith('/api/auth/')
  );
}

function isAuthEntryRoute(pathname: string, locale: string): boolean {
  return AUTH_ENTRY_ROUTES.has(stripLocale(pathname, locale));
}

function shouldCheckMarketingHomeAuth(pathname: string, locale: string): boolean {
  return pathname === `/${locale}`;
}

function withPrivateNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

function withRequestId(response: NextResponse, requestId: string) {
  return attachRequestIdHeader(response, requestId);
}

function trustedRequestHeaders(req: NextRequest, requestId: string) {
  const requestHeaders = buildCorrelatedRequestHeaders(req.headers, requestId);
  // Always overwrite the client-provided value. Server layouts use this only to
  // identify narrowly-approved billing recovery routes; it is never commercial
  // authority by itself.
  requestHeaders.set(INTERNAL_PATHNAME_HEADER, req.nextUrl.pathname);
  return requestHeaders;
}

function nextWithRequestId(req: NextRequest, requestId: string) {
  const requestHeaders = trustedRequestHeaders(req, requestId);
  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
}

function requestWithRequestId(req: NextRequest, requestId: string) {
  return new NextRequest(req, {
    headers: trustedRequestHeaders(req, requestId),
  });
}

function preserveTrustedRequestOverrides(response: NextResponse, req: NextRequest, requestId: string) {
  // next-intl may already serialize its own request-header overrides (for example
  // locale metadata) on the response. Preserve those names and append only our
  // trusted server-owned headers; replacing the entire override list would drop
  // next-intl metadata and can break localized runtime navigation.
  const overrideCarrier = NextResponse.next({
    request: { headers: trustedRequestHeaders(req, requestId) },
  });
  const overrideNames = new Set(
    (response.headers.get('x-middleware-override-headers') ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );

  for (const name of [INTERNAL_PATHNAME_HEADER, 'x-request-id']) {
    const value = overrideCarrier.headers.get(`x-middleware-request-${name}`);
    if (value !== null) {
      response.headers.set(`x-middleware-request-${name}`, value);
      overrideNames.add(name);
    }
  }

  if (overrideNames.size > 0) {
    response.headers.set('x-middleware-override-headers', Array.from(overrideNames).join(','));
  }

  return response;
}

type SupabaseSessionCheck = {
  isAuthenticated: boolean;
  response: NextResponse;
};

async function getSupabaseUserId(req: NextRequest, requestId: string): Promise<SupabaseSessionCheck> {
  const response = intlMiddleware(requestWithRequestId(req, requestId));
  preserveTrustedRequestOverrides(response, req, requestId);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { isAuthenticated: Boolean(user), response };
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const requestId = createTrustedRequestId(req.headers.get('x-request-id'));

  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === BEAGLE_DOMAIN_VERIFICATION_PATH ||
    pathname.startsWith('/api/')
  ) {
    return nextWithRequestId(req, requestId);
  }

  const normalizedLegacyPath = normalizeLegacyUndefinedPath(pathname);
  if (normalizedLegacyPath) {
    const url = req.nextUrl.clone();
    url.pathname = normalizedLegacyPath;
    return withRequestId(NextResponse.redirect(url, 308), requestId);
  }

  const pathnameLocale = locales.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const headerLocale = req.headers.get('x-vercel-ip-country')
    ? COUNTRY_TO_LOCALE[req.headers.get('x-vercel-ip-country')!.toUpperCase()]
    : undefined;
  const locale = pathnameLocale ?? (locales.includes(cookieLocale as 'en') ? cookieLocale : undefined) ?? headerLocale ?? defaultLocale;

  if (isPublicRoute(pathname, locale)) {
    return withRequestId(intlMiddleware(requestWithRequestId(req, requestId)), requestId);
  }

  const { isAuthenticated, response } = await getSupabaseUserId(req, requestId);

  if (isAuthEntryRoute(pathname, locale) && isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${AUTH_SUCCESS_PATH}`;
    return withPrivateNoStore(withRequestId(NextResponse.redirect(url), requestId));
  }

  if (shouldCheckMarketingHomeAuth(pathname, locale) && isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${ORGANIZATION_DASHBOARD_PATH}`;
    return withPrivateNoStore(withRequestId(NextResponse.redirect(url), requestId));
  }

  if (!isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('next', `${pathname}${req.nextUrl.search}`);
    return withPrivateNoStore(withRequestId(NextResponse.redirect(url), requestId));
  }

  return withPrivateNoStore(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
