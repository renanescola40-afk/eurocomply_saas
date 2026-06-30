import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales, defaultLocale, COUNTRY_TO_LOCALE } from '@/lib/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);
const LOCALE_COOKIE = 'NEXT_LOCALE';
const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations';
const AUTH_SUCCESS_PATH = '/onboarding';
const SENTRY_TUNNEL_PATH = '/monitoring';
const CHECKOUT_PLAN_IDS = new Set(['starter', 'growth', 'enterprise', 'essential', 'professional', 'business', 'basic', 'pro']);
const AUTH_ENTRY_ROUTES = new Set(['/login', '/signup', '/register']);
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/register', '/auth', '/auth/callback', '/oauth/complete', '/pricing', '/enterprise', '/checkout', '/resources', '/faq', '/about', '/contact', '/book-demo', '/recuperar-senha', '/atualizar-senha', '/trust', '/security', '/compliance', '/data-processing', '/sla', '/privacy', '/terms', '/dpa', '/subprocessors', '/status', '/vulnerability-disclosure', '/politica-privacidade', '/termos-servico'];
const LEGACY_UNDEFINED_ROUTES: Record<string, string> = { '/dashboard/organizations/vendors': '/vendor-assurance', '/dashboard/organizations/risks': '/dashboard/organizations/risks', '/dashboard/organizations/documents': '/dashboard/organizations/documents', '/dashboard/organizations/tasks': '/aprovacoes', '/dashboard/organizations/reports': '/dashboard/organizations/reports-governance', '/pricing': '/pricing' };

function stripLocale(pathname: string, locale: string): string { return locales.includes(locale as 'en') && pathname.startsWith(`/${locale}`) ? pathname.replace(`/${locale}`, '') || '/' : pathname; }
function isPublicRoute(pathname: string, locale: string): boolean { const path = stripLocale(pathname, locale); return PUBLIC_ROUTES.some(route => path === route || path.startsWith('/auth/') || path.startsWith('/api/auth/')); }
function isAuthEntryRoute(pathname: string, locale: string): boolean { return AUTH_ENTRY_ROUTES.has(stripLocale(pathname, locale)); }
function shouldCheckMarketingHomeAuth(pathname: string, locale: string): boolean { return pathname === `/${locale}`; }
function withPrivateNoStore(response: NextResponse) { response.headers.set('Cache-Control', 'private, no-store, max-age=0'); return response; }

function normalizeLegacyUndefinedPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'undefined') return LEGACY_UNDEFINED_ROUTES[`/${segments.slice(1).join('/')}`] ?? `/${segments.slice(1).join('/')}`;
  if (segments.length >= 2 && locales.includes(segments[0] as 'en') && segments[1] === 'undefined') {
    const locale = segments[0];
    const legacyPath = `/${segments.slice(2).join('/')}`;
    const destination = LEGACY_UNDEFINED_ROUTES[legacyPath] ?? `/${segments.slice(2).join('/')}`;
    return `/${locale}${destination === '/' ? '' : destination}`;
  }
  return null;
}

function detectLocale(req: NextRequest): string {
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale as 'en')) return cookieLocale;
  const country = req.headers.get('CF-IPCountry') ?? req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? '';
  if (country && COUNTRY_TO_LOCALE[country]) return COUNTRY_TO_LOCALE[country];
  const acceptLanguage = req.headers.get('Accept-Language') ?? '';
  for (const browserLocale of acceptLanguage.split(',').map((l) => l.split(';')[0].trim().toLowerCase().replace('_', '-')).filter(Boolean)) {
    if (locales.includes(browserLocale as 'en')) return browserLocale;
    const base = browserLocale.split('-')[0];
    if (locales.includes(base as 'en')) return base;
  }
  return defaultLocale;
}

async function getSupabaseUserId(req: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const client = createServerClient(url, key, { cookies: { getAll: () => req.cookies.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user?.id ?? null;
}

function getCheckoutPlanRedirect(pathname: string, req: NextRequest) {
  const segments = pathname.split('/').filter(Boolean);
  const locale = locales.includes(segments[0] as 'en') ? segments[0] : null;
  if (!locale || segments[1] !== 'checkout' || segments.length !== 2) return null;
  const plan = req.nextUrl.searchParams.get('plan')?.trim().toLowerCase();
  if (plan && CHECKOUT_PLAN_IDS.has(plan)) return null;
  const pricingUrl = new URL(`/${locale}/pricing`, req.url);
  pricingUrl.searchParams.set('checkout', 'select_plan');
  return NextResponse.redirect(pricingUrl);
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname === SENTRY_TUNNEL_PATH || pathname.startsWith(`${SENTRY_TUNNEL_PATH}/`) || pathname.startsWith('/_next') || pathname.startsWith('/next_api') || pathname.includes('.')) return NextResponse.next();
  const checkoutPlanRedirect = getCheckoutPlanRedirect(pathname, req); if (checkoutPlanRedirect) return checkoutPlanRedirect;
  const normalizedLegacyPath = normalizeLegacyUndefinedPath(pathname);
  if (normalizedLegacyPath && normalizedLegacyPath !== pathname) { const redirectUrl = new URL(normalizedLegacyPath, req.url); redirectUrl.search = req.nextUrl.search; return NextResponse.redirect(redirectUrl); }
  const pathnameHasLocale = locales.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);
  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    const isPublic = isPublicRoute(pathname, locale);
    const isMarketingHome = shouldCheckMarketingHomeAuth(pathname, locale);
    const isAuthEntry = isAuthEntryRoute(pathname, locale);
    const shouldCheckAuth = !isPublic || isMarketingHome || isAuthEntry;
    const cookieResponse = NextResponse.next();
    const userId = shouldCheckAuth ? await getSupabaseUserId(req, cookieResponse) : null;
    const isAuthenticated = Boolean(userId);
    if (!isAuthenticated && !isPublic) { const loginUrl = new URL(`/${locale}/login`, req.url); loginUrl.searchParams.set('next', `${pathname}${req.nextUrl.search}`); return withPrivateNoStore(NextResponse.redirect(loginUrl)); }
    if (isAuthenticated && (isMarketingHome || isAuthEntry)) { const dashboardUrl = new URL(`/${locale}${AUTH_SUCCESS_PATH}`, req.url); return withPrivateNoStore(NextResponse.redirect(dashboardUrl)); }
    const response = intlMiddleware(req); response.cookies.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' }); return response;
  }
  if (pathname.startsWith('/api')) return NextResponse.next();
  const detected = detectLocale(req); const redirectUrl = new URL(`/${detected}${pathname}`, req.url); redirectUrl.search = req.nextUrl.search; const response = NextResponse.redirect(redirectUrl); response.cookies.set(LOCALE_COOKIE, detected, { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' }); return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|monitoring|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
