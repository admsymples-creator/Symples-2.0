import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cliente para uso no Client Components (Browser)
export function createBrowserClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas')
  }

  return createSSRBrowserClient<Database>(supabaseUrl, supabaseKey)
}

// Função auxiliar: criar cliente com token explícito
export function createClientWithToken(accessToken: string) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas')
  }

  const client = createSSRBrowserClient<Database>(supabaseUrl, supabaseKey)
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: '', // Token de refresh não disponível neste contexto
  })
  return client
}



