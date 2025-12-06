import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from 'next/server'
import { acceptInvite } from "@/lib/actions/members";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  // ✅ CORREÇÃO 1: Lógica defensiva - tenta pegar token de múltiplas fontes
  // 1. Prioridade: Parâmetro da URL (funciona para OAuth e Magic Link quando não é removido)
  let inviteToken = searchParams.get('invite');
  
  // 2. Fallback: Cookie (para casos onde o Magic Link teve os parâmetros removidos)
  if (!inviteToken) {
    const cookieStore = await cookies();
    inviteToken = cookieStore.get('pending_invite')?.value || null;
  }

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 1. Pegar o usuário logado
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // 2. Se houver token de convite (da URL ou cookie), aceitar automaticamente
        if (inviteToken) {
          try {
            // acceptInvite retorna { success: true } ou lança erro
            await acceptInvite(inviteToken);
            
            // Limpar cookie após aceitar com sucesso e criar cookie de just_accepted
            const cookieStore = await cookies();
            cookieStore.delete('pending_invite');
            
            // ✅ CORREÇÃO 4: Criar cookie temporário para indicar que acabou de aceitar convite
            // Isso permite que o layout evite redirecionar para onboarding
            cookieStore.set('just_accepted_invite', 'true', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60, // 1 minuto apenas (suficiente para evitar loop)
              path: '/',
            });
            
            // Revalidar o cache para garantir que os workspaces sejam recarregados
            revalidatePath("/", "layout");
            revalidatePath("/home");
            
            // Aguardar um pouco para garantir que o workspace_members foi criado
            // e então verificar se foi criado com sucesso
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Verificar se o workspace foi adicionado com sucesso
            // Usar a mesma lógica que getUserWorkspaces para consistência
            const { data: memberWorkspaces } = await supabase
              .from('workspace_members')
              .select('workspace_id')
              .eq('user_id', user.id);
            
            if (memberWorkspaces && memberWorkspaces.length > 0) {
              // Se encontrou pelo menos um workspace, redirecionar para home
              // O layout vai carregar os workspaces corretamente agora
              // Adicionar parâmetro para indicar que acabou de aceitar convite
              return NextResponse.redirect(`${origin}/home?invite_accepted=true`);
            } else {
              // Se não encontrou, tentar mais uma vez após um delay maior
              await new Promise(resolve => setTimeout(resolve, 700));
              const { data: memberWorkspacesRetry } = await supabase
                .from('workspace_members')
                .select('workspace_id')
                .eq('user_id', user.id);
              
              if (memberWorkspacesRetry && memberWorkspacesRetry.length > 0) {
                return NextResponse.redirect(`${origin}/home?invite_accepted=true`);
              } else {
                // Se mesmo assim não encontrou, pode ter dado erro
                // Mas vamos redirecionar para home mesmo assim, pois o acceptInvite pode ter funcionado
                // e o problema pode ser apenas de cache/RLS
                // Adicionar parâmetro para evitar redirecionamento para onboarding
                console.warn('Workspace não encontrado imediatamente após aceitar convite, mas redirecionando mesmo assim');
                return NextResponse.redirect(`${origin}/home?invite_accepted=true`);
              }
            }
          } catch (inviteError: any) {
            console.error('Erro ao aceitar convite no callback:', inviteError);
            // Limpar cookie em caso de erro
            const cookieStore = await cookies();
            cookieStore.delete('pending_invite');
            // Se falhar, redirecionar para a página de invite para mostrar o erro
            return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=accept_failed`);
          }
        }

        // 3. Se não há token de convite, verificar se já tem workspace
        const { data: member } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .maybeSingle()

        // 4. Decidir destino
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
