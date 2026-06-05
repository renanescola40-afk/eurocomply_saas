// middleware.ts - Versão COMBINADA (i18n + Auth)

import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales, defaultLocale, COUNTRY_TO_LOCALE } from '@/lib/i18n/routing';

// Configuração do i18n
const intlMiddleware = createIntlMiddleware(routing);

// Chave do cookie para persistir escolha do utilizador
const LOCALE_COOKIE = 'NEXT_LOCALE';

// Rotas públicas (não exigem login)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth',
  '/recuperar-senha',
  '/atualizar-senha',
  '/politica-privacidade',
  '/termos-servico'
];

// Verifica se a rota é pública (não precisa de autenticação)
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

/**
 * Determina o idioma com base em:
 * 1. Preferencia salva em cookie (prioridade máxima)
 * 2. Header de pais (Cloudflare/Vercel)
 * 3. Header Accept-Language do browser
 * 4. Fallback para EN
 */
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

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Pular assets estáticos, APIs internas e callbacks de autenticação.
  // /auth/callback NÃO deve receber prefixo de locale, porque o Supabase volta exatamente para essa URL.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/next_api') ||
    pathname.startsWith('/zoer_proxy') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request: req });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let session = null;

  if (supabaseUrl && supabaseAnonKey) {
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

    const { data } = await supabase.auth.getSession();
    session = data.session;
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    const isPublic = isPublicRoute(pathname, locale);

    if (!session && !isPublic) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }

    if (session && pathname === `/${locale}/login`) {
      const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    const country =
      req.headers.get('CF-IPCountry') ??
      req.headers.get('x-vercel-ip-country') ??
      req.headers.get('cf-ipcountry') ??
      '';
    const detectedLocale = COUNTRY_TO_LOCALE[country] ?? defaultLocale;

    const hasCookie = req.cookies.get(LOCALE_COOKIE)?.value;
    const response = intlMiddleware(req);

    if (!hasCookie && detectedLocale !== defaultLocale) {
      response.cookies.set(LOCALE_COOKIE, detectedLocale, {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
      });
    }

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
  }

  const detected = detectLocale(req);

  if (routing.localePrefix === 'as-needed' && detected === defaultLocale) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, detected, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
  }

  const redirectUrl = new URL(`/${detected}${pathname}`, req.url);
  redirectUrl.search = req.nextUrl.search;

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(LOCALE_COOKIE, detected, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|next_api|zoer_proxy|.*\\..*).*)'],
};
