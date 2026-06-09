import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_FILE = /\.[^/]+$/;
const protectedSegments = ['/dashboard', '/settings', '/billing', '/team'];
const publicAuthSegments = ['/login', '/signup'];
const DEFAULT_LOCALE = 'pt';

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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.sentry.io https://vitals.vercel-insights.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    "upgrade-insecure-requests",
  ].join('; '),
};

function applySecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function getLocale(pathname: string) {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return firstSegment && /^[a-z]{2}$/.test(firstSegment) ? firstSegment : DEFAULT_LOCALE;
}

function stripLocale(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] && /^[a-z]{2}$/.test(parts[0])) {
    return '/' + parts.slice(1).join('/');
  }
  return pathname;
}

function matchesSegment(pathname: string, segments: string[]) {
  const normalized = stripLocale(pathname);
  return segments.some((segment) => normalized === segment || normalized.startsWith(`${segment}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || PUBLIC_FILE.test(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const user = data.user;
  const locale = getLocale(pathname);

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
