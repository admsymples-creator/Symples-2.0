'use server'

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from 'next/cache'
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { clearUserWorkspacesCache } from "@/lib/actions/user";

export async function createWorkspace(formData: FormData) {
  const supabase = await createServerActionClient()

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  // 2. Dados do formulário
  const name = formData.get('name') as string
  const segment = formData.get('segment') as string // Se a tabela tiver coluna segment, podemos usar

  if (!name) {
    return { error: 'Nome da empresa é obrigatório' }
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('account_plan')
    .eq('id', user.id)
    .single();

  const hasAgencyAccount = (profileData as any)?.account_plan === 'agency';

  const { data: existingMemberships, error: existingError } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      workspaces:workspace_id (
        id,
        name,
        slug,
        plan
      )
    `)
    .eq('user_id', user.id);

  if (existingError) {
    console.error('Erro ao buscar workspaces existentes:', existingError);
    return { error: 'Erro ao verificar limite de workspaces' };
  }

  const existingWorkspaces = (existingMemberships || [])
    .map((item: any) => (Array.isArray(item.workspaces) ? item.workspaces[0] : item.workspaces))
    .filter((ws: any) => ws && typeof ws === 'object');

  const personalWorkspaces = existingWorkspaces.filter((ws: any) => isPersonalWorkspace(ws, existingWorkspaces));
  const professionalWorkspaces = existingWorkspaces.filter((ws: any) => !isPersonalWorkspace(ws, existingWorkspaces));
  const isPersonalName = name.trim().toLowerCase() === "pessoal";

  const getPlanTier = (workspaces: any[]) => {
    let tier: "starter" | "pro" | "business" | "agency" = "starter";
    for (const ws of workspaces) {
      const plan = (ws?.plan || "").toLowerCase();
      if (plan === "agency") return "agency";
      if (plan === "business") tier = "business";
      if (plan === "pro" && tier !== "business") tier = "pro";
    }
    return tier;
  };

  const planTier = getPlanTier(existingWorkspaces);

  if (!hasAgencyAccount && planTier !== "agency") {
    if (isPersonalName && personalWorkspaces.length >= 1) {
      return { error: "Você já tem um workspace pessoal." };
    }

    if (planTier === "starter" && !isPersonalName) {
      return { error: "Plano Pessoal permite apenas um workspace pessoal." };
    }

    if ((planTier === "pro" || planTier === "business") && isPersonalName && personalWorkspaces.length >= 1) {
      return { error: "Seu plano permite apenas 1 workspace pessoal." };
    }

    if ((planTier === "pro" || planTier === "business") && !isPersonalName && professionalWorkspaces.length >= 1) {
      return { error: "Seu plano permite apenas 1 workspace profissional." };
    }
  }

  // 3. Gerar Magic Code (#START-XXXX) e Slug
  const randomCode = Math.floor(1000 + Math.random() * 9000)
  const magicCode = `#START-${randomCode}`
  
  // Gerar slug a partir do nome
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui não-alphanumérico por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens do início/fim
    + '-' + randomCode // Sufixo para unicidade

  // 4. Insert (Supabase)
  // Inserir Workspace com Trial
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 dias no futuro
  
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name,
      owner_id: user.id,
      magic_code: magicCode,
      slug,
      plan: 'pro', // Trial padrão: Pro
      subscription_status: 'trialing', // Status de trial
      trial_ends_at: trialEndsAt, // 14 dias no futuro
      member_limit: 5, // Limite do Pro durante trial
      // segment: segment 
    })
    .select()
    .single()

  if (workspaceError) {
    console.error('Erro ao criar workspace:', workspaceError)
    if (workspaceError.code === '42501') {
      return { error: 'Erro de permissão: RLS policies não configuradas no Supabase. Execute o script SQL fornecido.' }
    }
    return { error: `Erro (${workspaceError.code}): ${workspaceError.message}` }
  }

  // Tentar garantir que o membro foi adicionado (caso a trigger falhe ou demore)
  // Usamos upsert com ignoreDuplicates para não falhar se a trigger já tiver funcionado
  const { error: memberError } = await supabase
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      },
      { onConflict: 'workspace_id, user_id', ignoreDuplicates: true }
    )

  if (memberError) {
    console.error('Erro ao garantir membro:', memberError)
    // Não retornamos erro aqui para não travar o fluxo, já que o workspace foi criado
  }

  // Limpar cache para que o novo workspace apareça imediatamente apÇüs o redirect
  await clearUserWorkspacesCache(user.id);

  // Revalidar o layout principal para atualizar a lista de workspaces
  revalidatePath('/', 'layout')
  revalidatePath('/home');
  revalidatePath(`/${workspace.slug}/home`);

  // 5. Retorno
  return {
    success: true,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    magicCode,
  }
}
