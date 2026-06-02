/**
 * src/lib/security/xss.ts
 *
 * Sanitização XSS — limpa inputs do utilizador antes de guardar
 * ou antes de mostrar na resposta.
 *
 * XSS = Cross-Site Scripting: atacante injeta código JS malicioso
 * num input que depois é executado no browser de outra pessoa.
 *
 * Exemplo de ataque:
 *   Utilizador regista-se com nome: <img src=x onerror=alert('hack')>
 *   Quando o admin vê a lista de utilizadores, o JS corre.
 *
 * Este módulo usa DOMPurify (mesma biblioteca que o Tiptap, GitHub, etc.)
 * para sanitizar todo o input antes de guardar no banco.
 *
 * Para uso no BACKEND (Next.js API Routes):
 *   O DOMPurify funciona no Node.js com jsdom.
 *
 * Para uso no FRONTEND (React):
 *   Use DOMPurify diretamente no browser.
 */

import DOMPurify from 'isomorphic-dompurify';

// ─────────────────────────────────────────────────────────────────────────────
// Configuração — o que é PERMITIDO (allowlist) vs BLOQUEADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuração RESTRITIVA para conteúdo que vai para HTML.
 * Só permite tags de formatação de texto simples.
 */
const HTML_CONFIG = {
  ALLOWED_TAGS: [
    // Formatação
    'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span',
    // Listas
    'ul', 'ol', 'li',
    // Cabeçalhos
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Blocos
    'blockquote', 'code', 'pre',
    // Links (só com href válido)
    'a',
    // tabelas
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: [
    'href',        // links
    'title',       // tooltips
    'class',       // CSS classes (sem inline styles)
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Para links abrirem noutra tab
  FORCE_BODY: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true,
};

/**
 * Configuração PARA ATRIBUTOS HTML (não HTML completo).
 * Usa-se para strings que vão dentro de atributos HTML como title="...".
 */
const ATTR_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: ['title'],
  KEEP_CONTENT: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Funções de sanitização
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitiza HTML completo (ex: texto rico de um editor WYSIWYG).
 * Remove todo o JavaScript, event handlers, e URLs perigosas.
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, HTML_CONFIG);
}

/**
 * Sanitiza texto simples que vai para dentro de atributos HTML.
 * Remove tudo exceto texto plano.
 */
export function sanitizeAttr(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, ATTR_CONFIG).trim();
}

/**
 * Sanitiza texto para usar em JSON (sem HTML).
 * Remove caracteres de controlo e normaliza.
 */
export function sanitizeText(dirty: unknown): string {
  if (typeof dirty !== 'string') return '';

  return dirty
    // Remove tags HTML
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove caracteres de controlo
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Normaliza whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Limita tamanho (evita DoS com strings gigantes)
    .slice(0, 10_000);
}

/**
 * Valida que uma URL é segura (não é javascript: nem data:).
 * Retorna a URL se for segura, null se não for.
 */
export function sanitizeURL(dirty: string): string | null {
  if (!dirty || typeof dirty !== 'string') return null;

  const trimmed = dirty.trim().toLowerCase();

  // URLs perigosas
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('on')
  ) {
    return null;
  }

  // URL relativa é ok
  if (trimmed.startsWith('/')) return dirty.trim();

  // URL absoluta tem de começar com https
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return dirty.trim();
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware de sanitização para Next.js API Routes
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Schema de sanitização para inputs de utilizador.
 * Use como parte da validação Zod:
 *
 * const schema = z.object({
 *   name: z.string().transform(sanitizeText),
 *   description: z.string().transform(sanitizeHTML),
 * });
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  rules: Partial<Record<keyof T, 'text' | 'html' | 'url' | 'attr'>>
): T {
  const result = { ...obj };

  for (const [key, rule] of Object.entries(rules)) {
    const value = result[key as keyof T];

    if (typeof value !== 'string') continue;

    switch (rule) {
      case 'html':
        (result as Record<string, unknown>)[key] = sanitizeHTML(value);
        break;
      case 'text':
        (result as Record<string, unknown>)[key] = sanitizeText(value);
        break;
      case 'url':
        (result as Record<string, unknown>)[key] = sanitizeURL(value) ?? value;
        break;
      case 'attr':
        (result as Record<string, unknown>)[key] = sanitizeAttr(value);
        break;
    }
  }

  return result;
}

/**
 * Middleware genérico de sanitização.
 * Aplica-se a todas as rotas API.
 *
 * usage em API route:
 *   export async function POST(req: NextRequest) {
 *     const sanitized = await sanitizeRequest(req, {
 *       body: { name: 'text', description: 'html' }
 *     });
 *   }
 */
export async function sanitizeRequest(
  req: NextRequest,
  rules: Record<string, 'text' | 'html' | 'url' | 'attr'>
): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    // Body vazio é ok
  }

  return sanitizeObject(body, rules);
}

/**
 * Wrapper para API routes que sanitiza inputs automaticamente.
 * Adiciona ao início de cada handler:
 *
 * const body = await sanitize(req, {
 *   fullName: 'text',
 *   bio: 'html',
 *   website: 'url',
 * });
 */
export function createSanitizedHandler(
  handler: (req: NextRequest, body: Record<string, unknown>) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    let body: Record<string, unknown> = {};

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    // Não sanitizamos tudo — só o que vem do utilizador
    // Campos internos (userId, workspaceId) vêm do token JWT, não do body

    return handler(req, body);
  };
}
