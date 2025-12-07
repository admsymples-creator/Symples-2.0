import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from 'next/server'
import { acceptInvite, getInviteDetails } from "@/lib/actions/members";
import { getUserWorkspaces } from "@/lib/actions/user";
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
  let inviteTokenFromCookie = false;
  
  // 2. Fallback: Cookie (para casos onde o Magic Link teve os parâmetros removidos)
  // MAS só usar cookie se vier do parâmetro 'next' da URL que indica fluxo de convite
  if (!inviteToken) {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('pending_invite')?.value || null;
    
    // ✅ CORREÇÃO: Só usar cookie se o 'next' indicar fluxo de convite
    // Isso previne usar cookies residuais em logins tradicionais
    if (cookieToken && next.includes('/invite/')) {
      inviteToken = cookieToken;
      inviteTokenFromCookie = true;
    } else if (cookieToken) {
      // Se há cookie mas não é fluxo de convite, limpar cookie residual
      cookieStore.delete('pending_invite');
    }
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
        // 2. Se houver token de convite (da URL ou cookie), validar e aceitar
        if (inviteToken) {
          try {
            // ✅ CORREÇÃO: Validar se o convite realmente existe e está pendente
            // antes de tentar aceitar (evita usar tokens inválidos/expirados em logins tradicionais)
            const inviteDetails = await getInviteDetails(inviteToken);
            
            // Se o convite não existe, já foi aceito, ou está expirado, não processar
            if (!inviteDetails || inviteDetails.status !== 'pending') {
              // Limpar cookie se for de cookie residual
              if (inviteTokenFromCookie) {
                const cookieStore = await cookies();
                cookieStore.delete('pending_invite');
              }
              // Redirecionar para home normalmente (login tradicional)
              // Usar mesma lógica de retry do login tradicional
              revalidatePath("/", "layout");
              revalidatePath("/home");
              await new Promise(resolve => setTimeout(resolve, 300));
              
              let workspaces = await getUserWorkspaces();
              if (workspaces.length === 0) {
                const maxAttempts = 3;
                const delayMs = 500;
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                  workspaces = await getUserWorkspaces();
                  if (workspaces.length > 0) break;
                }
              }
              
              if (workspaces.length > 0) {
                return NextResponse.redirect(`${origin}/home`);
              } else {
                return NextResponse.redirect(`${origin}/onboarding`);
              }
            }
            
            // Se chegou aqui, o convite é válido e está pendente - processar
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

        // 3. Se não há token de convite, limpar cookie residual (se existir)
        // e verificar se já tem workspace
        const cookieStore = await cookies();
        if (cookieStore.get('pending_invite')) {
          // Limpar cookie residual de convites anteriores não utilizados
          cookieStore.delete('pending_invite');
        }
        
        // ✅ CORREÇÃO: Revalidar cache após login tradicional para garantir
        // que os workspaces sejam recarregados corretamente
        revalidatePath("/", "layout");
        revalidatePath("/home");
        
        // ✅ CORREÇÃO: Aguardar e fazer múltiplas tentativas com getUserWorkspaces
        // para garantir que a sessão e cache estejam totalmente estabelecidos
        // Isso resolve o problema de timing onde na primeira vez não encontra workspaces
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let workspaces = await getUserWorkspaces();
        
        // Se não encontrou na primeira tentativa, fazer retry (mesma lógica do fluxo de convite)
        if (workspaces.length === 0) {
          const maxAttempts = 3;
          const delayMs = 500;
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            workspaces = await getUserWorkspaces();
            
            if (workspaces.length > 0) {
              console.log(`✅ [Auth Callback] Workspaces encontrados na tentativa ${attempt + 1} após login tradicional`);
              break;
            }
          }
        }

        // 4. Decidir destino (sem parâmetro invite_accepted em login tradicional)
        if (workspaces.length > 0) {
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
