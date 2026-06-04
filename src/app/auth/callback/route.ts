import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/pt/dashboard';

  let response = NextResponse.redirect(new URL(next, request.url));

  if (!code) {
    const loginUrl = new URL('/pt/login', request.url);
    loginUrl.searchParams.set('error', 'missing_oauth_code');
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = new URL('/pt/login', request.url);
    loginUrl.searchParams.set('error', 'supabase_env_missing');
    return NextResponse.redirect(loginUrl);
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
    const loginUrl = new URL('/pt/login', request.url);
    loginUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
