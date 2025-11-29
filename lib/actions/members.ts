"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Tipo para os membros retornados
export type Member = {
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  invited_by: string | null;
};

/**
 * Busca os membros de um workspace específico
 */
export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createServerActionClient();
  
  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      user_id,
      role,
      joined_at,
      profiles:user_id (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Erro ao buscar membros:", error);
    return [];
  }

  // Cast para garantir a tipagem correta, já que o join pode retornar array ou objeto
  return data as unknown as Member[];
}

/**
 * Busca convites pendentes de um workspace
 */
export async function getPendingInvites(workspaceId: string) {
  const supabase = await createServerActionClient();

  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar convites:", JSON.stringify(error, null, 2));
    return [];
  }

  return data as Invite[];
}

/**
 * Envia um convite para um novo membro
 */
export async function inviteMember(workspaceId: string, email: string, role: "admin" | "member" | "viewer") {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  // 1. Verificar permissões (se é admin do workspace)
  // Consultamos a tabela workspace_members diretamente
  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
    throw new Error("Permissão negada. Apenas admins podem convidar.");
  }

  // 2. Verificar se já é membro
  // Podemos verificar a tabela workspace_members diretamente
  // Mas primeiro vamos normalizar o email
  const normalizedEmail = email.toLowerCase().trim();

  // Buscar o ID do usuário pelo email (se existir no banco)
  // Nota: public.profiles tem email, mas auth.users é o principal. 
  // Como profiles é espelho, podemos consultar profiles.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existingProfile) {
    const { data: isMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", existingProfile.id)
      .single();
      
    if (isMember) {
      throw new Error("Este usuário já é membro do workspace.");
    }
  }

  // 3. Verificar se já existe convite pendente
  const { data: existingInvite } = await supabase
    .from("workspace_invites")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    throw new Error("Já existe um convite pendente para este email.");
  }

  // 4. Criar o convite
  const { data: newInvite, error: insertError } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email: normalizedEmail,
      role,
      invited_by: user.id,
      status: "pending"
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Erro ao criar convite:", insertError);
    throw new Error("Erro ao criar convite.");
  }

  revalidatePath("/settings");

  // Retornar o link do convite para teste (em produção, dispararia email)
  // O token será o próprio ID do convite neste caso simplificado, ou poderíamos gerar um hash
  return { 
    success: true, 
    inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${newInvite.id}` 
  };
}

/**
 * Revoga (cancela) um convite
 */
export async function revokeInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  
  // A política RLS 'Admins can delete workspace invites' deve proteger isso
  // Mas precisamos garantir que o usuário atual é admin do workspace do convite
  // O RLS cuidará disso se configurado corretamente.
  
  const { error } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId);

  if (error) {
    throw new Error("Erro ao revogar convite");
  }

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Aceita um convite
 */
export async function acceptInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Verificar se o convite existe e é válido
  // Usamos service_role aqui? Não, o RLS permite ler se o email bater.
  // Mas se o usuário logado tiver email diferente do convite?
  // O ideal é que o usuário logado corresponda ao email do convite OU 
  // o sistema permita que ele aceite e vincule (mas nosso RLS restringe visualização).
  
  // Se o RLS impedir a leitura do convite por outro email, teremos problema se o usuário
  // logar com conta diferente da convidada.
  // Vamos assumir que o usuário deve logar com o email convidado ou que o link é público o suficiente
  // para a página de aceite ler (mas RLS bloqueia).
  
  // Para a action de aceite funcionar, precisamos contornar o RLS de leitura se o email for diferente
  // ou simplesmente confiar no ID passado se for um token único difícil de adivinhar (UUID é).
  
  // Vamos tentar ler. Se falhar, pode ser RLS.
  // Na verdade, para aceitar, precisamos atualizar.
  
  // IMPORTANTE: Para aceitar convite, vamos usar uma query 'sudo' se necessário, 
  // mas idealmente o usuário logado deve ser o dono do email.
  
  if (!user) {
    // Se não estiver logado, redirecionar para login com callback
    redirect(`/login?next=/invite/${inviteId}`);
  }

  // Buscar convite (sem RLS check seria melhor aqui para validar token, mas vamos tentar normal)
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    // Se não achou, pode ser token inválido ou RLS bloqueando porque email não bate.
    // Vamos tentar verificar se o email do usuário bate com o convite?
    // Se o RLS bloqueia, não conseguimos nem ler o email do convite.
    
    // WORKAROUND: Se não conseguimos ler, assumimos inválido ou sem permissão.
    // Mas se o usuário clicou no link, ele tem o token.
    throw new Error("Convite inválido ou não encontrado.");
  }

  if (invite.status !== 'pending') {
    throw new Error("Este convite não está mais pendente.");
  }
  
  // Validar se o email do usuário logado bate com o convite
  // (Opcional: permitir aceitar com outro email? Geralmente não por segurança)
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new Error(`Este convite foi enviado para ${invite.email}, mas você está logado como ${user.email}.`);
  }

  // 2. Adicionar membro
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role
    });

  if (memberError) {
    // Se der erro de duplicidade (PK), é pq já é membro
    if (memberError.code === '23505') { // Unique violation
       // Apenas atualiza o convite para accepted
    } else {
       console.error("Erro ao adicionar membro:", memberError);
       throw new Error("Erro ao processar adesão ao workspace.");
    }
  }

  // 3. Atualizar status do convite
  await supabase
    .from("workspace_invites")
    .update({ status: 'accepted' })
    .eq("id", inviteId);

  revalidatePath("/dashboard"); // ou root
  
  return { success: true };
}

/**
 * Busca dados do convite (público/protegido) para a página de aceite
 * Essa função precisa ser capaz de ler o convite mesmo se o usuário não estiver logado
 * ou se o usuário logado for diferente (para mostrar "Você foi convidado como X").
 * 
 * Como o RLS bloqueia leitura de convites de outros emails, 
 * teremos um problema na página de landing do convite se não usarmos admin client
 * ou ajustarmos RLS.
 * 
 * Para simplificar, vamos assumir que se o usuário não logar, ele não vê detalhes,
 * só vê "Faça login para aceitar".
 */
export async function getInviteDetails(inviteId: string) {
    const supabase = await createServerActionClient();
    
    // Tenta buscar normal
    const { data, error } = await supabase
        .from("workspace_invites")
        .select(`
            *,
            workspaces (name),
            invited_by_profile:invited_by (full_name)
        `)
        .eq("id", inviteId)
        .single();
        
    if (error) return null;
    
    return data;
}

