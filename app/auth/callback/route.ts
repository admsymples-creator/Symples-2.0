import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from 'next/server'
import { acceptInvite } from "@/lib/actions/members";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite')
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
        // 2. Se houver token de convite, aceitar automaticamente
        if (inviteToken) {
          try {
            await acceptInvite(inviteToken);
            
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
