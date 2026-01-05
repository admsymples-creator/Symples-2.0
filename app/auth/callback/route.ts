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

  // ✅ TASK 3: Priority Check - URL param FIRST (most reliable)
  // 1. PRIORIDADE: Parâmetro 'invite' na URL (mais confiável, funciona sempre)
  let inviteToken = searchParams.get('invite');
  let inviteTokenSource = inviteToken ? 'url' : null;
  
  // 2. FALLBACK: Cookie 'pending_invite' (backup se URL não tiver)
  if (!inviteToken) {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('pending_invite')?.value || null;
    
    if (cookieToken) {
      inviteToken = cookieToken;
      inviteTokenSource = 'cookie';
      console.log('✅ [Auth Callback] Usando invite token do cookie:', cookieToken.substring(0, 8) + '...');
    }
  } else {
    console.log('✅ [Auth Callback] Usando invite token da URL:', inviteToken.substring(0, 8) + '...');
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
        // ✅ TASK 3: Se houver token de convite (da URL ou cookie), ACEITAR IMEDIATAMENTE
        if (inviteToken) {
          try {
            console.log('🔍 [Auth Callback] Validando convite:', inviteToken.substring(0, 8) + '...');
            
            // Validar se o convite realmente existe e está pendente
            const inviteDetails = await getInviteDetails(inviteToken);
            
            // Se o convite não existe, já foi aceito, ou está expirado
            if (!inviteDetails || inviteDetails.status !== 'pending') {
              console.warn('⚠️ [Auth Callback] Convite inválido ou não pendente:', {
                exists: !!inviteDetails,
                status: inviteDetails?.status,
              });
              
              // Limpar cookie se veio do cookie
              if (inviteTokenSource === 'cookie') {
                const cookieStore = await cookies();
                cookieStore.delete('pending_invite');
              }
              
              // Redirecionar para home normalmente (login tradicional)
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
            
            // ✅ TASK 3: Convite válido e pendente - ACEITAR IMEDIATAMENTE
            console.log('✅ [Auth Callback] Aceitando convite válido:', inviteToken.substring(0, 8) + '...');
            const acceptResult = await acceptInvite(inviteToken);
            
            // Limpar cookie após aceitar com sucesso
            const cookieStore = await cookies();
            cookieStore.delete('pending_invite');
            
            // Revalidar cache
            revalidatePath("/", "layout");
            revalidatePath("/home");
            
            // ✅ Redirecionar diretamente para o workspace usando o slug retornado
            if (acceptResult.success && acceptResult.workspaceSlug) {
              const redirectUrl = `${origin}/${acceptResult.workspaceSlug}/tasks?invite_accepted=true`;
              console.log('✅ [Auth Callback] Redirecionando para workspace:', acceptResult.workspaceSlug);
              return NextResponse.redirect(redirectUrl);
            } else {
              // Fallback: aguardar e tentar buscar workspace
              await new Promise(resolve => setTimeout(resolve, 500));
              const { data: memberWorkspaces } = await supabase
                .from('workspace_members')
                .select('workspace_id')
                .eq('user_id', user.id);
              
              if (memberWorkspaces && memberWorkspaces.length > 0) {
                const acceptedWorkspaceId = inviteDetails.workspace_id;
                const { data: workspaceData } = await supabase
                  .from('workspaces')
                  .select('id, slug')
                  .eq('id', acceptedWorkspaceId)
                  .single();
                
                let redirectUrl = `${origin}/home?invite_accepted=true`;
                if (workspaceData?.slug) {
                  redirectUrl = `${origin}/${workspaceData.slug}/tasks?invite_accepted=true`;
                }
                return NextResponse.redirect(redirectUrl);
              } else {
                // Retry após delay maior
                await new Promise(resolve => setTimeout(resolve, 1000));
                const { data: memberWorkspacesRetry } = await supabase
                  .from('workspace_members')
                  .select('workspace_id')
                  .eq('user_id', user.id);
              
              if (memberWorkspacesRetry && memberWorkspacesRetry.length > 0) {
                const acceptedWorkspaceId = inviteDetails.workspace_id;
                const { data: workspaceData } = await supabase
                  .from('workspaces')
                  .select('id, slug')
                  .eq('id', acceptedWorkspaceId)
                  .single();
                
                let redirectUrl = `${origin}/home?invite_accepted=true`;
                if (workspaceData) {
                  const workspacePath = workspaceData.slug || workspaceData.id;
                  redirectUrl = `${origin}/${workspacePath}/tasks?invite_accepted=true`;
                }
                
                return NextResponse.redirect(redirectUrl);
              } else {
                // Mesmo sem encontrar, redirecionar para home com flag
                console.warn('⚠️ [Auth Callback] Workspace não encontrado após retry, redirecionando para /home');
                return NextResponse.redirect(`${origin}/home?invite_accepted=true`);
              }
            }
            } catch (inviteError: any) {
            console.error('❌ [Auth Callback] Erro ao aceitar convite:', inviteError);
            // Limpar cookie em caso de erro
            const cookieStore = await cookies();
            cookieStore.delete('pending_invite');
            // Redirecionar para página de invite para mostrar erro
            return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=accept_failed`);
          }
        }

        // 3. Se não há token de convite, limpar cookie residual e verificar workspaces
        const cookieStore = await cookies();
        if (cookieStore.get('pending_invite')) {
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
