import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Atualizar sessão (refresh token se necessário)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas públicas (acessíveis sem autenticação)
  const publicRoutes = ['/login', '/onboarding']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Rotas protegidas (dentro de (main))
  const protectedRoutes = ['/home', '/tasks', '/finance', '/team', '/settings', '/billing']
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Se tentar acessar rota protegida sem sessão -> Redirect para /login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Se estiver autenticado e tentar acessar /login
  // Redirecionar para /home (exceto se estiver vindo do callback)
  if (user && pathname === '/login') {
    // Verificar se não é um callback do auth
    if (!pathname.includes('/auth/callback')) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  // Retornar response com cookies atualizados
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

