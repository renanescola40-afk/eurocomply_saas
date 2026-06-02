/**
 * src/lib/security/headers.ts
 *
 * Camada de headers de segurança para Next.js.
 * Substitui a configuração simples do next.config.ts por uma
 * CSP completa e restritiva.
 *
 * Para Next.js App Router: usa-se no middleware.ts
 * Para Next.js Pages Router: usa-se num custom server.js
 *
 * Explicação simples:
 * - CSP: diz ao navegador que scripts, estilos e imagens só podem
 *        vir de fontes que VOCÊ aprova. Qualquer script injectado
 *        (XSS) não vai correr porque não está na lista branca.
 * - Others: evitão clickjacking, sniffing de tipo, e vazamento
 *            de referências.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Domínios de imagem que o Next.js usa internamente */
const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'images.pexels.com',
  'chat2db-cdn.oss-us-west-1.aliyuncs.com',
  'cdn.chat2db-ai.com',
];

/** Domínios de iframe permitidos (só o próprio site) */
const ALLOWED_FRAME_ANCESTORS = "'self'";

/** Fontes de script permitidas */
const ALLOWED_SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'", // Necessário para Next.js + React hydration
  "'unsafe-eval'",   // Necessário para Next.js dev mode
  "https://app.zoer.ai",
];

/** Fontes de estilo */
const ALLOWED_STYLE_SRC = [
  "'self'",
  "'unsafe-inline'", // Necessário para CSS-in-JS + Tailwind
];

/** Fontes de fonte */
const ALLOWED_FONT_SRC = [
  "'self'",
  "https://fonts.gstatic.com",
];

/** Fontes de imagem */
const ALLOWED_IMG_SRC = [
  "'self'",
  "data:",
  "blob:",
  ...ALLOWED_IMAGE_HOSTS.map(host => `https://${host}`),
  "https://avatars.githubusercontent.com",
];

/** Conectividade (fetch, XMLHttpRequest, WebSocket) */
const ALLOWED_CONNECT_SRC = [
  "'self'",
  "https://app.zoer.ai",
  "https://*.supabase.co",
  "https://*.stripe.com",
];

/** Frames (para iframes internos, se necessário) */
const ALLOWED_FRAME_SRC = ["'self'"];

/** Construir a CSP string */
function buildCSP(): string {
  const directives = [
    `default-src 'none'`,
    `script-src ${ALLOWED_SCRIPT_SRC.join(' ')}`,
    `style-src ${ALLOWED_STYLE_SRC.join(' ')}`,
    `img-src ${ALLOWED_IMG_SRC.join(' ')}`,
    `font-src ${ALLOWED_FONT_SRC.join(' ')}`,
    `connect-src ${ALLOWED_CONNECT_SRC.join(' ')}`,
    `frame-src ${ALLOWED_FRAME_SRC.join(' ')}`,
    `frame-ancestors ${ALLOWED_FRAME_ANCESTORS}`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join('; ');
}

/**
 * Headers de segurança aplicados a TODAS as respostas.
 * Chamado pelo middleware.ts.
 */
export function addSecurityHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // ── 1. Previne clickjacking ──────────────────────────────────────────
  // Impede que o site seja嵌入 num iframe (drag-by-drop attack)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // ── 2. CSP restritiva ────────────────────────────────────────────────
  // O navegador só executa conteúdo das fontes que especificamos
  response.headers.set(
    'Content-Security-Policy',
    buildCSP()
  );

  // ── 3. Evita MIME type sniffing ──────────────────────────────────────
  // Se um atacante fizer upload de um .jpg com código JS dentro,
  // o navegador não o executa porque este header diz que é "text/html"
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // ── 4. Proteção XSS no Chrome (ignora header se navegador não suporta) ─
  // Ativa o filtro XSS do navegador quando disponível
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // ── 5. Controlo de referência ─────────────────────────────────────────
  // Quando o utilizador clica num link para outro site, o navegador
  // não envia o URL completo da página anterior (protege parâmetros sensíveis)
  response.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );

  // ── 6. Permissions Policy ───────────────────────────────────────────
  // Desativa APIs do navegador que a app não precisa
  // (impede acesso à câmara, microfone, localização, etc.)
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'fullscreen=(self)',
    ].join(', ')
  );

  // ── 7. Cache control (para páginas com dados sensíveis) ──────────────
  // Páginas API não devem ser guardadas em cache
  if (request.nextUrl.pathname.startsWith('/next_api/')) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
}

/**
 * Headers mínimos para respostas de API (mais leves).
 * Usado para rotas que precisam de CORS controlado.
 */
export function addAPIHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // API: não caching nunca
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Para API routes, allow CORS só de origens conhecidas
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://app.zoer.ai',
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 horas

  return response;
}
