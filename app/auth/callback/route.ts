import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerClient()

    // Trocar o código por uma sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Erro ao trocar código por sessão:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }

    // Verificar se o usuário tem um workspace
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin))
    }

    // Verificar se o usuário tem pelo menos um workspace
    const { data: workspaceMembers, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)

    if (workspaceError) {
      console.error('Erro ao verificar workspace:', workspaceError)
      // Em caso de erro, redirecionar para onboarding (usuário novo)
      return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
    }

    // Redirecionamento inteligente
    if (workspaceMembers && workspaceMembers.length > 0) {
      // Usuário tem workspace -> redirecionar para /home
      return NextResponse.redirect(new URL('/home', requestUrl.origin))
    } else {
      // Usuário novo sem workspace -> redirecionar para /onboarding
      return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
    }
  }

  // Se não houver código, redirecionar para login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

