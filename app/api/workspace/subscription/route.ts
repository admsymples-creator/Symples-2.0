import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se usuário é membro do workspace e obter sua role
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Workspace não encontrado ou sem permissão' },
        { status: 403 }
      );
    }

    // Buscar dados de subscription do workspace
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id, plan, subscription_status, trial_ends_at')
      .eq('id', workspaceId)
      .single();

    if (error || !workspace) {
      return NextResponse.json(
        { error: 'Erro ao buscar dados do workspace' },
        { status: 500 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_plan')
      .eq('id', user.id)
      .single();

    // Retornar dados de subscription junto com a role do usuário
    return NextResponse.json({
      ...workspace,
      account_plan: (profile as any)?.account_plan ?? null,
      userRole: member.role,
    });
  } catch (error) {
    console.error('Erro ao buscar subscription:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

