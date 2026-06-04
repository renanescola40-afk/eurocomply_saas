// middleware.ts - Versão COMBINADA (i18n + Auth)

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales, defaultLocale, COUNTRY_TO_LOCALE } from '@/lib/i18n/routing';

// Configuração do i18n
const intlMiddleware = createIntlMiddleware(routing);

// Chave do cookie para persistir escolha do utilizador
const LOCALE_COOKIE = 'NEXT_LOCALE';

// Rotas públicas (não exigem login)
const PUBLIC_ROUTES = [
  '/',           // página inicial
  '/login',      // login
  '/auth',       // callbacks auth
  '/recuperar-senha',
  '/atualizar-senha',
  '/politica-privacidade',
  '/termos-servico'
];

// Verifica se a rota é pública (não precisa de autenticação)
function isPublicRoute(pathname: string, locale: string): boolean {
  // Remove o locale do caminho se existir
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

  // ==================== PARTE 1: AUTENTICAÇÃO ====================
  // Criar cliente Supabase para verificar sessão
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // ==================== PARTE 2: I18N (lógica existente) ====================
  
  // Rotas que já são /[locale]/... passam pelo next-intl normalmente
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Pega o locale da URL
    const locale = pathname.split('/')[1];
    
    // Verifica se a rota é pública
    const isPublic = isPublicRoute(pathname, locale);
    
    // Se NÃO está logado E rota NÃO é pública → redireciona para login
    if (!session && !isPublic) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Se está logado E tentou acessar login → redireciona para dashboard
    if (session && (pathname === `/${locale}/login` || pathname === `/${locale}/auth/callback`)) {
      const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }
    
    // Detetar país e guardar cookie para uso futuro
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
    return response;
  }

  // Sem locale — detetar e redirecionar
  const detected = detectLocale(req);
  
  if (routing.localePrefix === 'as-needed' && detected === defaultLocale) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, detected, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
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

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|next_api|zoer_proxy|.*\\..*).*)'],
};
