import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { assertSafeEnvironment } from '@/lib/security/env-guard';

const PUBLIC_FILE = /\.[^/]+$/;
const supportedLocales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
type SupportedLocale = (typeof supportedLocales)[number];
const protectedSegments = [
  '/dashboard',
  '/settings',
  '/billing',
  '/team',
  '/profile',
  '/enterprise-readiness',
  '/security-center',
  '/security-questionnaire',
  '/retention-center',
  '/continuity-center',
  '/vendor-assurance',
  '/audit-pack',
  '/notificacoes',
  '/auditoria',
  '/risck-comply-home',
  '/riscos',
  '/documentos',
  '/raci',
  '/calendario-compliance',
  '/aprovacoes',
  '/ai-systems',
  '/ai-incidents',
];
const publicAuthSegments = ['/login', '/signup'];
const DEFAULT_LOCALE: SupportedLocale = 'en';
const isProduction = process.env.NODE_ENV === 'production';

const securityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    isProduction
      ? "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.sentry.io"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.sentry.io https://vitals.vercel-insights.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    'upgrade-insecure-requests',
  ].join('; '),
};

function applySecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return Boolean(value && supportedLocales.includes(value as SupportedLocale));
}

function pickLocaleFromAcceptLanguage(header: string | null): SupportedLocale | null {
  if (!header) return null;

  const languageRanges = header
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase().slice(0, 2))
    .filter(Boolean);

  for (const language of languageRanges) {
    if (isSupportedLocale(language)) return language;
  }

  return null;
}

function getLocale(request: NextRequest) {
  const firstSegment = request.nextUrl.pathname.split('/').filter(Boolean)[0];
  if (isSupportedLocale(firstSegment)) return firstSegment;

  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  return pickLocaleFromAcceptLanguage(request.headers.get('accept-language')) ?? DEFAULT_LOCALE;
}

function stripLocale(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (isSupportedLocale(parts[0])) {
    return '/' + parts.slice(1).join('/');
  }
  return pathname;
}

function matchesSegment(pathname: string, segments: string[]) {
  const normalized = stripLocale(pathname);
  return segments.some((segment) => normalized === segment || normalized.startsWith(`${segment}/`));
}

export async function proxy(request: NextRequest) {
  assertSafeEnvironment();
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || PUBLIC_FILE.test(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  let response = NextResponse.next({ request });
  let user: User | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const locale = getLocale(request);

  if (!user && matchesSegment(pathname, protectedSegments)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    redirectUrl.searchParams.set('next', pathname);
    return applySecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  if (user && matchesSegment(pathname, publicAuthSegments)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/dashboard/organizations`;
    redirectUrl.search = '';
    return applySecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!monitoring|_next/static|_next/image|favicon.ico).*)'],
};
