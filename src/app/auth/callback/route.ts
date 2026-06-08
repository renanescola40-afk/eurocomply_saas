import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getLocaleFromNextPath(nextPath: string) {
  const firstSegment = nextPath.split('/').filter(Boolean)[0];
  return firstSegment || 'pt';
}

function getLoginUrl(request: NextRequest, nextPath: string, error: string) {
  const locale = getLocaleFromNextPath(nextPath);
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('error', error);
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/pt/dashboard/organizations';

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
