import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales, defaultLocale, COUNTRY_TO_LOCALE } from '@/lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Chave do cookie para persistir escolha do utilizador
const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * Determina o idioma com base em:
 * 1. Preferencia salva em cookie (prioridade máxima)
 * 2. Header de pais (Cloudflare/Vercel)
 * 3. Header Accept-Language do browser
 * 4. Fallback para EN
 */
function detectLocale(req: NextRequest): string {
  // 1. Cookie salvo pelo utilizador
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale as 'en')) {
    return cookieLocale;
  }

  // 2. País via header (Cloudflare: CF-IPCountry, Vercel: x-vercel-ip-country)
  const country =
    req.headers.get('CF-IPCountry') ??
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    '';

  if (country && COUNTRY_TO_LOCALE[country]) {
    return COUNTRY_TO_LOCALE[country];
  }

  // 3. Accept-Language do browser
  const acceptLanguage = req.headers.get('Accept-Language') ?? '';
  const browserLocales = acceptLanguage
    .split(',')
    .map((l) => l.split(';')[0].trim().toLowerCase().replace('_', '-'))
    .filter(Boolean);

  for (const browserLocale of browserLocales) {
    // Match exato
    if (locales.includes(browserLocale as 'en')) {
      return browserLocale;
    }
    // Match parcial (e.g. "pt-BR" → "pt")
    const base = browserLocale.split('-')[0];
    if (locales.includes(base as 'en')) {
      return base;
    }
  }

  // 4. Fallback
  return defaultLocale;
}

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Pular assets estáticos e rotas API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/next_api') ||
    pathname.startsWith('/zoer_proxy') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rotas que já são /[locale]/... passam pelo next-intl normalmente
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Detetar país e guardar cookie para uso futuro
    const country =
      req.headers.get('CF-IPCountry') ??
      req.headers.get('x-vercel-ip-country') ??
      req.headers.get('cf-ipcountry') ??
      '';
    const detectedLocale = COUNTRY_TO_LOCALE[country] ?? defaultLocale;

    // Guardar cookie de pais se ainda não existir locale salvo
    const hasCookie = req.cookies.get(LOCALE_COOKIE)?.value;
    const response = intlMiddleware(req);
    if (!hasCookie && detectedLocale !== defaultLocale) {
      response.cookies.set(LOCALE_COOKIE, detectedLocale, {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
      });
    }
    return response;
  }

  // Sem locale — detetar e redirecionar
  const detected = detectLocale(req);
  const redirectUrl = new URL(`/${detected}${pathname}`, req.url);
  redirectUrl.search = req.nextUrl.search;

  const response = NextResponse.redirect(redirectUrl);

  // Guardar cookie da escolha
  response.cookies.set(LOCALE_COOKIE, detected, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|next_api|zoer_proxy|.*\\..*).*)'],
};
