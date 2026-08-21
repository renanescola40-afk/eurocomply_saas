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

const PUBLIC_ROUTE_PREFIXES = ['/features/'] as const;

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

function applySupabaseSessionCookies(response: NextResponse, sessionResponse?: NextResponse) {
  if (!sessionResponse) return response;

  for (const cookie of sessionResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}

function appendSafeAuthQuery(url: URL, req: NextRequest) {
  const plan = req.nextUrl.searchParams.get('plan')?.trim().toLowerCase();

  if (plan && CHECKOUT_PLAN_IDS.has(plan)) {
    url.searchParams.set('plan', plan);
  }
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

function getLegacyDiagnosticsRedirect(pathname: string, req: NextRequest) {
  const segments = pathname.split('/').filter(Boolean);
  const locale = locales.includes(segments[0] as 'en') ? segments[0] : null;

  if (!locale || segments[1] !== 'auth' || segments[2] !== 'diagnostics') {
    return null;
  }

  const loginUrl = new URL(`/${locale}/login`, req.url);
  return withPrivateNoStore(NextResponse.redirect(loginUrl));
}

function getCheckoutPlanRedirect(pathname: string, req: NextRequest) {
  const segments = pathname.split('/').filter(Boolean);
  const locale = locales.includes(segments[0] as 'en') ? segments[0] : null;

  if (!locale || segments[1] !== 'checkout' || segments.length !== 2) {
    return null;
  }

  const plan = req.nextUrl.searchParams.get('plan')?.trim().toLowerCase();

  if (plan && CHECKOUT_PLAN_IDS.has(plan)) {
    return null;
  }

  const pricingUrl = new URL(`/${locale}/pricing`, req.url);
  pricingUrl.searchParams.set('checkout', 'select_plan');
  return NextResponse.redirect(pricingUrl);
}

function getUnsafePremiumSelectorRedirect(pathname: string, req: NextRequest) {
  const segments = pathname.split('/').filter(Boolean);
  const locale = locales.includes(segments[0] as 'en') ? segments[0] : null;
  if (!locale || stripLocale(pathname, locale) !== PREMIUM_NEWS_PATH) return null;
  if (!req.nextUrl.searchParams.has('premium')) return null;

  // The page historically treated ?premium=1 as a visibility override. Query
  // parameters are presentation inputs only and can never grant a paid feature.
  const safeUrl = new URL(req.url);
  safeUrl.searchParams.delete('premium');
  return withPrivateNoStore(NextResponse.redirect(safeUrl));
}

async function hasSupabaseSession(req: NextRequest): Promise<SupabaseSessionCheck> {
  const response = NextResponse.next({ request: { headers: req.headers } });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { isAuthenticated: false, response };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  return {
    isAuthenticated: !error && Boolean(data.user),
    response,
  };
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === SENTRY_TUNNEL_PATH || pathname.startsWith(`${SENTRY_TUNNEL_PATH}/`)) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const requestId = createTrustedRequestId();

  if (pathname.startsWith('/next_api')) {
    return nextWithRequestId(req, requestId);
  }

  const legacyDiagnosticsRedirect = getLegacyDiagnosticsRedirect(pathname, req);
  if (legacyDiagnosticsRedirect) {
    return withRequestId(legacyDiagnosticsRedirect, requestId);
  }

  const checkoutPlanRedirect = getCheckoutPlanRedirect(pathname, req);
  if (checkoutPlanRedirect) {
    return withRequestId(checkoutPlanRedirect, requestId);
  }

  const premiumSelectorRedirect = getUnsafePremiumSelectorRedirect(pathname, req);
  if (premiumSelectorRedirect) {
    return withRequestId(premiumSelectorRedirect, requestId);
  }

  const normalizedLegacyPath = normalizeLegacyUndefinedPath(pathname);
  if (normalizedLegacyPath && normalizedLegacyPath !== pathname) {
    const redirectUrl = new URL(normalizedLegacyPath, req.url);
    redirectUrl.search = req.nextUrl.search;
    return withRequestId(NextResponse.redirect(redirectUrl), requestId);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    const isPublic = isPublicRoute(pathname, locale);
    const isMarketingHome = shouldCheckMarketingHomeAuth(pathname, locale);
    const isAuthEntry = isAuthEntryRoute(pathname, locale);
    const shouldCheckAuth = !isPublic || isMarketingHome || isAuthEntry;
    const sessionCheck = shouldCheckAuth ? await hasSupabaseSession(req) : null;
    const isAuthenticated = sessionCheck?.isAuthenticated ?? false;

    if (!isAuthenticated && !isPublic) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('next', `${pathname}${req.nextUrl.search}`);
      const response = withPrivateNoStore(NextResponse.redirect(loginUrl));
      return withRequestId(applySupabaseSessionCookies(response, sessionCheck?.response), requestId);
    }

    if (isAuthenticated && (isMarketingHome || isAuthEntry)) {
      const dashboardUrl = new URL(`/${locale}${AUTH_SUCCESS_PATH}`, req.url);
      appendSafeAuthQuery(dashboardUrl, req);
      const response = withPrivateNoStore(NextResponse.redirect(dashboardUrl));
      return withRequestId(applySupabaseSessionCookies(response, sessionCheck?.response), requestId);
    }

    const response = intlMiddleware(requestWithRequestId(req, requestId));
    preserveTrustedRequestOverrides(response, req, requestId);

    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });

    return withRequestId(applySupabaseSessionCookies(response, sessionCheck?.response), requestId);
  }

  if (pathname.startsWith('/api')) {
    return nextWithRequestId(req, requestId);
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

  return withRequestId(response, requestId);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|monitoring|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
