import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/lib/i18n/routing'

// Criar middleware do next-intl
const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar arquivos estáticos e assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // arquivos com extensão
  ) {
    return NextResponse.next()
  }

  // Primeiro, processar internacionalização
  const intlResponse = intlMiddleware(request)
  
  // Se o intlMiddleware retornou um redirect, seguir ele
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse
  }

  // Agora processar autenticação Supabase
  let supabaseResponse = intlResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          // Copiar cookies do intlResponse
          intlResponse.cookies.getAll().forEach(cookie => {
            supabaseResponse.cookies.set(cookie.name, cookie.value)
          })
          // Adicionar cookies do Supabase
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extrair o locale do pathname para construir URLs corretamente
  const localeMatch = pathname.match(/^\/(en|pt|es|fr|it|de)(\/|$)/)
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale
  const pathWithoutLocale = localeMatch 
    ? pathname.replace(/^\/(en|pt|es|fr|it|de)/, '') || '/'
    : pathname

  // Rotas protegidas - redireciona para login se não estiver autenticado
  const protectedRoutes = ['/dashboard', '/admin', '/profile', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => 
    pathWithoutLocale.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redireciona usuários autenticados da página de login para o dashboard
  const authRoutes = ['/login', '/signup', '/register']
  const isAuthRoute = authRoutes.some(route => 
    pathWithoutLocale === route
  )

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - ... if they start with `/_next`, `/api`
    // - ... the ones containing a dot (e.g. `favicon.ico`)
    '/((?!_next|api|.*\\..*).*)',
  ],
}
