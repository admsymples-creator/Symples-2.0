import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from 'next/server'
import { acceptInvite, getInviteDetails } from "@/lib/actions/members";
import { getUserWorkspaces, ensurePersonalWorkspace } from "@/lib/actions/user";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';

function isMobile(request: Request): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  // TASK 3: Priority Check - URL param FIRST (most reliable)
  // 1. PRIORIDADE: Parametro 'invite' na URL (mais confiavel, funciona sempre)
  let inviteToken = searchParams.get('invite');
  let inviteTokenSource = inviteToken ? 'url' : null;
  
  // 2. FALLBACK: Cookie 'pending_invite' (backup se URL nao tiver)
  if (!inviteToken) {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('pending_invite')?.value || null;
    
    if (cookieToken) {
      inviteToken = cookieToken;
      inviteTokenSource = 'cookie';
      console.log('[Auth Callback] Usando invite token do cookie:', cookieToken.substring(0, 8) + '...');
    }
  } else {
    console.log('[Auth Callback] Usando invite token da URL:', inviteToken.substring(0, 8) + '...');
  }

  const supabase = await createServerClient()
  let user: { id: string } | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user: u } } = await supabase.auth.getUser()
      user = u ?? null
    } else {
      console.error('[Auth Callback] Erro na troca do codigo OAuth:', error.message, error)
      // Redirecionar com a mensagem para exibir na tela de login
      const errorMsg = encodeURIComponent(error.message || 'oauth_exchange_failed')
      return NextResponse.redirect(`${origin}/login?error=oauth&message=${errorMsg}`)
    }
  } else {
    // Login com senha: sessão já está nos cookies, só precisamos ler o user
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u ?? null
  }

  if (user) {
    // 1. Usuário logado (OAuth com code ou sessão já em cookie no login com senha)
    const trialDaysParam = searchParams.get('trial_days');
    const trialPlanParam = searchParams.get('trial_plan');
    const trialDaysValue = trialDaysParam ? Number(trialDaysParam) : null;
    const trialPlanValue = trialPlanParam && ['pro', 'business'].includes(trialPlanParam) ? trialPlanParam : null;
    if ((trialDaysValue && [15, 30, 60].includes(trialDaysValue)) || trialPlanValue) {
      const { error: trialUpdateError } = await supabase.auth.updateUser({
        data: {
          ...(trialDaysValue && [15, 30, 60].includes(trialDaysValue) ? { trial_days: String(trialDaysValue) } : {}),
          ...(trialPlanValue ? { trial_plan: trialPlanValue } : {}),
        },
      });
      if (trialUpdateError) {
        console.error('[Auth Callback] Erro ao salvar trial_days/trial_plan:', trialUpdateError);
      }
    }
    // TASK 3: Se houver token de convite (da URL ou cookie), ACEITAR IMEDIATAMENTE
    if (inviteToken) {
          try {
            console.log('[Auth Callback] Validando convite:', inviteToken.substring(0, 8) + '...');
            
            // Validar se o convite realmente existe e esta pendente
            const inviteDetails = await getInviteDetails(inviteToken);
            
            // Se o convite nao existe, ja foi aceito, ou esta expirado
            if (!inviteDetails || inviteDetails.status !== 'pending') {
              console.warn('[Auth Callback] Convite invalido ou nao pendente:', {
                exists: !!inviteDetails,
                status: inviteDetails?.status,
              });
              
              // Limpar cookie pendente para evitar retry com token inválido
              const cookieStore = await cookies();
              if (cookieStore.get('pending_invite')) {
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
                const homeOrAssistant = isMobile(request) ? '/assistant' : '/home';
                return NextResponse.redirect(`${origin}${homeOrAssistant}`);
              } else {
                return NextResponse.redirect(`${origin}/onboarding`);
              }
            }
            
            // TASK 3: Convite valido e pendente - ACEITAR IMEDIATAMENTE
            console.log('[Auth Callback] Aceitando convite valido:', inviteToken.substring(0, 8) + '...');
            const acceptResult = await acceptInvite(inviteToken);
            
            console.log('[Auth Callback] Resultado do acceptInvite:', {
              success: acceptResult.success,
              workspaceId: acceptResult.workspaceId,
              workspaceSlug: acceptResult.workspaceSlug,
            });
            
            // ✅ GARANTIR workspace pessoal após aceitar convite (novo usuário precisa dos 2 workspaces)
            // Isso garante que usuários novos tenham workspace pessoal + workspace convidado
            console.log('[Auth Callback] Garantindo workspace pessoal para novo usuário...');
            await ensurePersonalWorkspace();
            
            // Limpar cookie apos aceitar com sucesso
            const cookieStore = await cookies();
            cookieStore.delete('pending_invite');
            
            // Revalidar cache para garantir que ambos os workspaces apareçam
            revalidatePath("/", "layout");
            revalidatePath("/home");
            
            // Aguardar um pouco para garantir que o banco propagou os dados
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Redirecionar diretamente para o workspace usando o slug retornado
            if (acceptResult.success && acceptResult.workspaceSlug) {
              const redirectUrl = `${origin}/${acceptResult.workspaceSlug}/tasks?invite_accepted=true`;
              console.log('[Auth Callback] Redirecionando para workspace convidado:', acceptResult.workspaceSlug);
              return NextResponse.redirect(redirectUrl);
            } else {
              console.warn('[Auth Callback] WorkspaceSlug não disponível, usando fallback. Result:', acceptResult);
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
                // Retry apos delay maior
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
                  console.warn('[Auth Callback] Workspace nao encontrado apos retry, redirecionando para /home');
                  return NextResponse.redirect(`${origin}/home?invite_accepted=true`);
                }
              }
            }
          } catch (inviteError: any) {
            console.error('[Auth Callback] Erro ao aceitar convite:', inviteError);
            // Limpar cookie em caso de erro
            const cookieStore = await cookies();
            cookieStore.delete('pending_invite');
            // Redirecionar para pagina de invite para mostrar erro
            return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=accept_failed`);
          }
        }

        // 3. Se nao ha token de convite, limpar cookie residual e verificar workspaces
        const cookieStore = await cookies();
        if (cookieStore.get('pending_invite')) {
          cookieStore.delete('pending_invite');
        }
        
        // CORRECAO: Revalidar cache apos login tradicional para garantir
        // que os workspaces sejam recarregados corretamente
        revalidatePath("/", "layout");
        revalidatePath("/home");
        
        // CORRECAO: Aguardar e fazer multiplas tentativas com getUserWorkspaces
        // para garantir que a sessao e cache estejam totalmente estabelecidos
        // Isso resolve o problema de timing onde na primeira vez nao encontra workspaces
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let workspaces = await getUserWorkspaces();
        
        // Se nao encontrou na primeira tentativa, fazer retry (mesma logica do fluxo de convite)
        if (workspaces.length === 0) {
          const maxAttempts = 3;
          const delayMs = 500;
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            workspaces = await getUserWorkspaces();
            
            if (workspaces.length > 0) {
              console.log(`[Auth Callback] Workspaces encontrados na tentativa ${attempt + 1} apos login tradicional`);
              break;
            }
          }
        }

    // 4. Decidir destino (sem parametro invite_accepted em login tradicional)
    if (workspaces.length > 0) {
      const homeOrAssistant = isMobile(request) ? '/assistant' : '/home';
      return NextResponse.redirect(`${origin}${homeOrAssistant}`)
    } else {
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  // Se algo der errado, manda pro login com erro
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}

