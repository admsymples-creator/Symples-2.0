import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cliente para uso em Server Components e Server Actions
export async function createServerClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas')
  }

  const cookieStore = await cookies()

  return createSSRServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // A chamada `setAll` foi feita a partir de um Server Component.
          // Isso pode ser ignorado se você tiver middleware que atualiza os cookies.
        }
      },
    },
  })
}

// Cliente para uso em Server Actions (alias para createServerClient)
export async function createServerActionClient() {
  return createServerClient()
}

// Cliente para uso no Middleware (com cookies do request/response)
export function createMiddlewareClient(request: Request, response: Response) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas')
  }

  return createSSRServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.headers.get('cookie')?.split(';').map((cookie) => {
          const [name, ...rest] = cookie.trim().split('=')
          return { name, value: rest.join('=') }
        }) || []
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.headers.append(
            'Set-Cookie',
            `${name}=${value}; ${Object.entries(options || {})
              .map(([key, val]) => {
                if (key === 'maxAge') return `Max-Age=${val}`
                if (key === 'httpOnly') return val ? 'HttpOnly' : ''
                if (key === 'secure') return val ? 'Secure' : ''
                if (key === 'sameSite') return `SameSite=${val}`
                if (key === 'path') return `Path=${val}`
                return ''
              })
              .filter(Boolean)
              .join('; ')}`
          )
        })
      },
    },
  })
}



