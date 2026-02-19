import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// Lido no carregamento do módulo (build time no cliente = valor inlineado pelo Next)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas. Na Vercel, defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY e faça um novo deploy.')
  }
  const isSupabaseUrl = supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')
  if (!isSupabaseUrl) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL deve ser a URL do projeto Supabase (ex: https://xxx.supabase.co). Valor atual: ${supabaseUrl?.slice(0, 60) ?? 'vazio'}`)
  }
  return { supabaseUrl, supabaseKey }
}

// Cliente para uso no Client Components (Browser)
export function createBrowserClient() {
  const { supabaseUrl, supabaseKey } = getConfig()
  return createSSRBrowserClient<Database>(supabaseUrl, supabaseKey)
}

// Função auxiliar: criar cliente com token explícito
export function createClientWithToken(accessToken: string) {
  const { supabaseUrl, supabaseKey } = getConfig()
  const client = createSSRBrowserClient<Database>(supabaseUrl, supabaseKey)
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: '', // Token de refresh não disponível neste contexto
  })
  return client
}













