import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_FILE = /\.[^/]+$/;
const protectedSegments = ['/dashboard', '/settings', '/billing', '/team'];
const authSegments = ['/login', '/signup', '/auth'];

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
    return NextResponse.next();
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

  if (!user && matchesSegment(pathname, protectedSegments)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && matchesSegment(pathname, authSegments)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard/organizations';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
