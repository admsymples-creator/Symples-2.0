import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 1. Pegar o usuário logado
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // 2. Verificar se já tem workspace (Usando maybeSingle para não quebrar)
        // Se der erro, assume que não tem workspace e manda pro onboarding
        const { data: member } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .maybeSingle()

        // 3. Decidir destino
        if (member) {
          return NextResponse.redirect(`${origin}/home`)
        } else {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
    } else {
      console.error('Erro na troca do código:', error)
    }
  }

  // Se algo der errado, manda pro login com erro
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
