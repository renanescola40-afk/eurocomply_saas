import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { applyNoStoreHeaders, noStoreJson } from '@/server/security/no-store';
import {
  getAuthCallbackLoginUrl,
  getSafeAuthCallbackNextPath,
  resolveAuthAppBaseUrl,
} from '@/server/security/auth-callback';

function noStoreRedirect(url: URL) {
  return applyNoStoreHeaders(NextResponse.redirect(url));
}

function unavailableResponse() {
  return noStoreJson({ error: 'auth_app_url_unavailable' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appBaseUrl = resolveAuthAppBaseUrl(request.url);
  const oauthCode = requestUrl.searchParams.get('code');
  const next = getSafeAuthCallbackNextPath(requestUrl.searchParams.get('next'));

  if (!appBaseUrl) {
    console.warn('auth_app_url_unavailable');
    return unavailableResponse();
  }

  let response = noStoreRedirect(new URL(next, appBaseUrl));

  if (!oauthCode) {
    return noStoreRedirect(getAuthCallbackLoginUrl(appBaseUrl, next, 'missing_oauth_code'));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('auth_callback_configuration_unavailable');
    return noStoreRedirect(getAuthCallbackLoginUrl(appBaseUrl, next, 'auth_configuration_unavailable'));
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

  const exchangeResult = await supabase.auth.exchangeCodeForSession(oauthCode);

  if (exchangeResult.error) {
    console.warn('auth_callback_exchange_failed');
    return noStoreRedirect(getAuthCallbackLoginUrl(appBaseUrl, next, 'auth_exchange_failed'));
  }

  return response;
}
