"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sendInviteEmail } from "@/lib/email/send-invite";

// Tipo para os membros retornados
export type Member = {
  user_id: string;
  role: string;
  joined_at: string | null;
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
 * Busca a role do usuário atual em um workspace
 */
export async function getCurrentUserRole(workspaceId: string): Promise<string | null> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  return data.role;
}

/**
 * Busca os membros de um workspace específico
 */
export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createServerActionClient();
  
  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("getWorkspaceMembers: Usuário não autenticado");
    return [];
  }

  // Verificar se workspaceId é válido
  if (!workspaceId) {
    console.warn("getWorkspaceMembers: workspaceId não fornecido");
    return [];
  }

  try {
    // Usar a mesma sintaxe que funciona em tasks.ts (user:user_id ao invés de profiles:user_id)
    // Buscar membros - não selecionar campos de data que podem não existir
    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        role,
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("workspace_id", workspaceId);

    if (error) {
      // Log detalhado do erro com serialização JSON para garantir que seja visível
      const errorInfo = {
        message: error?.message || "Sem mensagem",
        details: error?.details || "Sem detalhes",
        hint: error?.hint || "Sem hint",
        code: error?.code || "Sem código",
        workspaceId,
        userId: user?.id,
      };
      
      console.error("Erro ao buscar membros do workspace:");
      console.error(JSON.stringify(errorInfo, null, 2));
      
      // Também logar o objeto de erro completo de forma segura
      try {
        console.error("Objeto de erro completo:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error("Erro ao serializar objeto de erro:", e);
      }

      // Tentar buscar sem join como fallback
      try {
        const { data: membersData, error: membersError } = await supabase
          .from("workspace_members")
          .select("user_id, role")
          .eq("workspace_id", workspaceId);

        // Verificar se há erro real (não apenas objeto vazio)
        if (membersError && (membersError.message || membersError.code || membersError.details)) {
          const errorDetails = {
            message: membersError?.message || "Sem mensagem",
            details: membersError?.details || "Sem detalhes",
            hint: membersError?.hint || "Sem hint",
            code: membersError?.code || "Sem código",
            workspaceId,
            userId: user?.id,
          };
          console.error("Erro também ao buscar membros sem join:");
          console.error(JSON.stringify(errorDetails, null, 2));
          return [];
        }

        if (!membersData) {
          console.warn("membersData é null ou undefined para workspace:", workspaceId);
          return [];
        }

        if (membersData.length === 0) {
          console.log("Nenhum membro encontrado para o workspace:", workspaceId);
          return [];
        }

        // Buscar profiles separadamente
        const userIds = membersData.map((m: any) => m.user_id);
        if (userIds.length === 0) {
          return [];
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", userIds);

        if (profilesError) {
          console.error("Erro ao buscar profiles:", profilesError);
        }

        // Combinar os dados
        return membersData.map((member: any) => {
          const profile = profilesData?.find((p: any) => p.id === member.user_id);
          return {
            user_id: member.user_id,
            role: member.role,
            joined_at: null, // Campo pode não existir no banco, usar null
            profiles: profile ? {
              full_name: profile.full_name,
              email: profile.email,
              avatar_url: profile.avatar_url,
            } : null,
          };
        }) as Member[];
      } catch (fallbackError: any) {
        console.error("Erro no fallback ao buscar membros:", fallbackError);
        return [];
      }
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transformar os dados para o formato esperado
    // A query retorna user ao invés de profiles
    return data.map((member: any) => {
      const userData = Array.isArray(member.user) 
        ? member.user[0] 
        : member.user;

      return {
        user_id: member.user_id,
        role: member.role,
        joined_at: null, // Campo pode não existir no banco, usar null
        profiles: userData ? {
          full_name: userData.full_name,
          email: userData.email,
          avatar_url: userData.avatar_url,
        } : null,
      };
    }) as Member[];
  } catch (err: any) {
    console.error("Erro inesperado ao buscar membros:", {
      error: err,
      message: err?.message,
      stack: err?.stack,
      workspaceId,
      userId: user?.id,
    });
    return [];
  }
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
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Não autenticado");

  // 1. Verificar permissões (se é admin do workspace)
  // Consultamos a tabela workspace_members diretamente
  const { data: memberData, error: memberDataError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberDataError && memberDataError.code !== 'PGRST116') {
    console.error("Erro ao verificar permissões:", memberDataError);
    throw new Error("Erro ao verificar permissões.");
  }

  if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
    throw new Error("Permissão negada. Apenas admins podem convidar.");
  }

  // 2. Normalizar email e verificar se usuário já existe
  const normalizedEmail = email.toLowerCase().trim();
  
  // Validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error("Email inválido.");
  }
  
  // Validação de workspaceId
  if (!workspaceId || typeof workspaceId !== 'string') {
    throw new Error("Workspace ID inválido.");
  }

  // Buscar o ID do usuário pelo email (se existir no banco)
  // Nota: public.profiles tem email, mas auth.users é o principal. 
  // Como profiles é espelho, podemos consultar profiles.
  // Usamos maybeSingle() para não lançar erro se não encontrar
  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  
  // Se houver erro (não relacionado a "não encontrado"), logar mas continuar
  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Erro ao verificar perfil existente:", profileError);
  }

  // CENÁRIO A: Se o usuário já existe, adicionar diretamente ao workspace
  if (existingProfile) {
    // Verificar se já é membro
    // Usamos maybeSingle() para não lançar erro se não encontrar
    const { data: isMember, error: memberCheckError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    
    // Se houver erro (não relacionado a "não encontrado"), logar mas continuar
    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error("Erro ao verificar se é membro:", memberCheckError);
    }
      
    if (isMember) {
      throw new Error("Este usuário já é membro do workspace.");
    }

    // Adicionar usuário existente diretamente ao workspace
    const { error: addMemberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: existingProfile.id,
        role: role,
      });

    if (addMemberError) {
      console.error("Erro ao adicionar membro existente:", addMemberError);
      throw new Error("Erro ao adicionar membro ao workspace.");
    }

    revalidatePath("/settings");
    revalidatePath("/team");

    return {
      success: true,
      message: "Usuário adicionado ao workspace com sucesso!",
      userExists: true,
    };
  }

  // CENÁRIO B: Usuário não existe - criar convite pendente
  // 3. Verificar se já existe convite pendente (ou qualquer convite com esse email)
  // Verificamos todos os status para dar uma mensagem mais clara
  const { data: existingInvite, error: inviteCheckError } = await supabase
    .from("workspace_invites")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("email", normalizedEmail)
    .maybeSingle();
  
  // Se houver erro (não relacionado a "não encontrado"), logar mas continuar
  if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
    console.error("Erro ao verificar convite existente:", inviteCheckError);
  }

  if (existingInvite) {
    if (existingInvite.status === 'pending') {
      throw new Error("Já existe um convite pendente para este email. Você pode cancelar o convite existente antes de criar um novo.");
    } else if (existingInvite.status === 'accepted') {
      throw new Error("Este email já foi aceito neste workspace. Verifique se o usuário já é membro.");
    } else if (existingInvite.status === 'cancelled') {
      // Se o convite foi cancelado, excluir o registro antigo antes de criar um novo
      console.log("🗑️ Excluindo convite cancelado antes de criar novo:", existingInvite.id);
      const { error: deleteError } = await supabase
        .from("workspace_invites")
        .delete()
        .eq("id", existingInvite.id);
      
      if (deleteError) {
        console.error("❌ Erro ao excluir convite cancelado:", deleteError);
        throw new Error("Erro ao limpar convite cancelado. Tente novamente.");
      }
      
      // Continuar o fluxo normalmente para criar o novo convite
      console.log("✅ Convite cancelado removido. Prosseguindo com criação do novo convite.");
    } else {
      throw new Error("Já existe um convite para este email (status: " + existingInvite.status + "). Você pode cancelar o convite existente antes de criar um novo.");
    }
  }

  // 4. Buscar informações do workspace e do usuário que está convidando
  const { data: workspaceData, error: workspaceError } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError && workspaceError.code !== 'PGRST116') {
    console.error("Erro ao buscar dados do workspace:", workspaceError);
    throw new Error("Erro ao buscar informações do workspace.");
  }

  if (!workspaceData) {
    throw new Error("Workspace não encontrado.");
  }

  const { data: inviterProfile, error: inviterError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (inviterError && inviterError.code !== 'PGRST116') {
    console.error("Erro ao buscar perfil do inviter:", inviterError);
    // Não falhamos o fluxo, apenas logamos - podemos continuar sem o nome
  }

  // 5. Criar o convite
  const { data: newInvite, error: insertError } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email: normalizedEmail,
      role,
      invited_by: user.id,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    console.error("❌ Erro ao criar convite:", {
      error: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
      fullError: JSON.stringify(insertError, Object.getOwnPropertyNames(insertError), 2),
    });
    
    // Tratar erro de constraint unique violation (convite duplicado)
    if (insertError.code === '23505') {
      throw new Error("Já existe um convite para este email neste workspace. Verifique a lista de convites pendentes.");
    }
    
    throw new Error(`Erro ao criar convite: ${insertError.message || 'Erro desconhecido'}`);
  }

  if (!newInvite || !newInvite.id) {
    console.error("❌ Convite criado mas não retornou ID:", { newInvite });
    throw new Error("Erro ao criar convite: ID não foi retornado.");
  }

  // 6. Gerar link de convite - apontar para a página de convite
  // O link vai para /invite/[token], e a página redireciona para signup se necessário
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const finalUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const inviteLink = `${finalUrl}/invite/${newInvite.id}`;

  // 7. Enviar email de convite via Resend
  let emailSent = false;
  let emailError: string | null = null;
  
  console.log("📧 Iniciando envio de email de convite:", {
    to: normalizedEmail,
    workspaceId: workspaceId,
    inviteId: newInvite.id,
    hasApiKey: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    inviteLink,
  });
  
  try {
    const emailResult = await sendInviteEmail({
      to: normalizedEmail,
      workspaceName: workspaceData?.name || "Workspace",
      inviterName: inviterProfile?.full_name || null,
      inviteLink,
      role,
      isNewUser: true, // Indica que é um novo usuário
    });
    
    emailSent = emailResult.success;
    
    if (emailResult.success) {
      console.log("✅ Email de convite enviado com sucesso:", { 
        to: normalizedEmail, 
        inviteId: newInvite.id,
        emailId: emailResult.id,
      });
    } else {
      emailError = emailResult.error || "Erro desconhecido";
      console.warn("⚠️ Email não foi enviado:", {
        to: normalizedEmail,
        inviteId: newInvite.id,
        error: emailError,
      });
    }
  } catch (err: any) {
    emailError = err.message || "Erro desconhecido ao enviar email";
    console.error("❌ Erro ao enviar email de convite:", {
      to: normalizedEmail,
      inviteId: newInvite.id,
      error: emailError,
      stack: err.stack,
      fullError: JSON.stringify(err, null, 2),
    });
    // Não falhamos o fluxo se o email falhar, mas logamos o erro
    // Em desenvolvimento, ainda retornamos o link manual
  }

  revalidatePath("/settings");
  revalidatePath("/team");

  return { 
    success: true, 
    inviteLink: process.env.NODE_ENV === "development" ? inviteLink : undefined,
    message: emailError 
      ? `Convite criado, mas houve erro ao enviar email: ${emailError}`
      : process.env.NODE_ENV === "development" 
        ? "Email simulado em desenvolvimento. Link disponível abaixo."
        : "Convite enviado por email com sucesso!",
    emailSent,
    emailError: emailError || undefined,
  };
  } catch (error: any) {
    console.error("❌ Erro crítico em inviteMember:", {
      message: error?.message || "Erro desconhecido",
      stack: error?.stack,
      name: error?.name,
      workspaceId,
      email,
      role,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });
    throw new Error(error?.message || "Erro ao processar convite. Verifique os logs para mais detalhes.");
  }
}

/**
 * Revoga (cancela) um convite
 */
export async function revokeInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  // Buscar o workspace do convite para verificar permissões
  const { data: invite } = await supabase
    .from("workspace_invites")
    .select("workspace_id")
    .eq("id", inviteId)
    .single();

  if (!invite) {
    throw new Error("Convite não encontrado");
  }

  // Verificar se o usuário é admin do workspace
  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
    throw new Error("Permissão negada. Apenas admins podem revogar convites.");
  }

  // Em desenvolvimento, excluir realmente para facilitar debug
  // Em produção, apenas marcar como cancelled para manter histórico
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    const { error } = await supabase
      .from("workspace_invites")
      .delete()
      .eq("id", inviteId);

    if (error) {
      throw new Error("Erro ao excluir convite");
    }
    
    console.log("🗑️ Convite excluído (modo desenvolvimento):", inviteId);
  } else {
    const { error } = await supabase
      .from("workspace_invites")
      .update({ status: "cancelled" })
      .eq("id", inviteId);

    if (error) {
      throw new Error("Erro ao revogar convite");
    }
  }

  revalidatePath("/settings");
  revalidatePath("/team");
  return { success: true };
}

/**
 * Reenvia um convite por email
 */
export async function resendInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  // Buscar dados do convite
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select(`
      *,
      workspaces (name),
      invited_by_profile:invited_by (full_name)
    `)
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    throw new Error("Convite não encontrado");
  }

  // Verificar permissões
  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
    throw new Error("Permissão negada. Apenas admins podem reenviar convites.");
  }

  if (invite.status !== "pending") {
    throw new Error("Apenas convites pendentes podem ser reenviados");
  }

  // Gerar link de convite
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const finalUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const inviteLink = `${finalUrl}/invite/${inviteId}`;

  // Enviar email
  try {
    await sendInviteEmail({
      to: invite.email,
      workspaceName: (invite.workspaces as any)?.name || "Workspace",
      inviterName: (invite.invited_by_profile as any)?.full_name || null,
      inviteLink,
      role: invite.role as "admin" | "member" | "viewer",
    });
  } catch (emailError: any) {
    console.error("Erro ao reenviar email de convite:", emailError);
    throw new Error(`Erro ao reenviar email: ${emailError.message}`);
  }

  revalidatePath("/settings");
  revalidatePath("/team");
  return { success: true, message: "Convite reenviado com sucesso!" };
}

/**
 * Remove um membro do workspace
 */
export async function removeMember(workspaceId: string, userId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  // Verificar se o usuário está tentando remover a si mesmo
  if (user.id === userId) {
    throw new Error("Você não pode remover a si mesmo do workspace.");
  }

  // Verificar permissões do usuário atual
  const { data: currentMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
    throw new Error("Permissão negada. Apenas admins podem remover membros.");
  }

  // Verificar se o membro a ser removido é owner
  const { data: targetMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (!targetMember) {
    throw new Error("Membro não encontrado");
  }

  // Apenas owner pode remover outro owner
  if (targetMember.role === "owner" && currentMember.role !== "owner") {
    throw new Error("Apenas o owner pode remover outro owner.");
  }

  // Remover membro
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao remover membro:", error);
    throw new Error("Erro ao remover membro");
  }

  revalidatePath("/settings");
  revalidatePath("/team");
  return { success: true };
}

/**
 * Atualiza a role de um membro
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  newRole: "admin" | "member" | "viewer"
) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  // Verificar permissões do usuário atual
  const { data: currentMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
    throw new Error("Permissão negada. Apenas admins podem alterar roles.");
  }

  // Verificar se o membro existe
  const { data: targetMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (!targetMember) {
    throw new Error("Membro não encontrado");
  }

  // Não permitir mudar role do owner
  if (targetMember.role === "owner") {
    throw new Error("Não é possível alterar a role do owner do workspace.");
  }

  // Apenas owner pode alterar role para admin
  if (newRole === "admin" && currentMember.role !== "owner") {
    throw new Error("Apenas o owner pode promover membros para admin.");
  }

  // Atualizar role
  const { error } = await supabase
    .from("workspace_members")
    .update({ role: newRole })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao atualizar role:", error);
    throw new Error("Erro ao atualizar função do membro");
  }

  revalidatePath("/settings");
  revalidatePath("/team");
  return { success: true };
}

/**
 * Aceita um convite
 */
export async function acceptInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Se não estiver logado, redirecionar para login com callback
    redirect(`/login?next=/invite/${inviteId}`);
  }

  // 1. VALIDAÇÃO: Buscar convite usando cliente normal (validações de RLS e email)
  // Tentamos ler com o cliente normal primeiro para garantir que o usuário tem permissão
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    throw new Error("Convite inválido ou não encontrado.");
  }

  if (invite.status !== 'pending') {
    throw new Error("Este convite não está mais pendente.");
  }
  
  // Validar se o email do usuário logado bate com o convite
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new Error(`Este convite foi enviado para ${invite.email}, mas você está logado como ${user.email}.`);
  }

  // Validar se o convite não expirou
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new Error("Este convite expirou.");
  }

  // 2. INSERÇÃO COM PRIVILÉGIOS ADMIN: Criar cliente Admin para bypass de RLS
  // Como o usuário ainda não é membro, RLS bloqueia a inserção.
  // Usamos Service Role para bypass, já que todas as validações acima foram feitas.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY não configurada");
    throw new Error("Configuração do servidor inválida. Contate o suporte.");
  }

  // Criar cliente admin (sem cookie handling, apenas para operações privilegiadas)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ✅ CORREÇÃO: Self-Healing Profile - Garantir que o perfil existe antes de inserir em workspace_members
  // Isso previne erros de Foreign Key quando o trigger não criou o perfil ainda (race condition)
  try {
    // Buscar dados do usuário em auth.users usando Admin API
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(user.id);
    
    if (authUserError || !authUserData?.user) {
      console.error("❌ Erro ao buscar dados do usuário em auth.users:", authUserError);
      throw new Error("Não foi possível buscar dados do usuário. Tente novamente.");
    }

    const authUser = authUserData.user;
    const userEmail = authUser.email || user.email || '';
    const userMetadata = authUser.user_metadata || {};
    
    // Extrair full_name dos metadados ou gerar a partir do email
    let fullName = userMetadata.full_name || userMetadata.name || null;
    if (!fullName && userEmail) {
      // Se não tiver nome, usar username do email (parte antes do @)
      const emailUsername = userEmail.split('@')[0];
      // Capitalizar primeira letra
      fullName = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
    }

    // Extrair avatar_url dos metadados
    const avatarUrl = userMetadata.avatar_url || authUser.user_metadata?.avatar_url || null;

    console.log("🔧 Garantindo que perfil existe para usuário:", {
      userId: user.id,
      email: userEmail,
      fullName,
      hasAvatar: !!avatarUrl,
    });

    // UPSERT do perfil (cria se não existe, atualiza se existe)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        email: userEmail,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error("❌ Erro ao criar/atualizar perfil:", {
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
      });
      throw new Error(`Erro ao criar perfil: ${profileError.message || 'Erro desconhecido'}`);
    }

    console.log("✅ Perfil garantido com sucesso");
  } catch (profileError: any) {
    // Se falhar no upsert do perfil, ainda tentamos continuar
    // (pode ser que o perfil já exista e o erro seja outro)
    if (profileError.message?.includes('perfil')) {
      throw profileError;
    }
    console.warn("⚠️ Aviso ao garantir perfil, mas continuando:", profileError.message);
  }

  // 3. Agora que o perfil existe, inserir membro usando cliente admin (bypass RLS)
  const { error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .insert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role
    });

  if (memberError) {
    // Se der erro de duplicidade (PK), é pq já é membro
    if (memberError.code === '23505') { // Unique violation
       console.log("✅ Usuário já é membro do workspace, apenas atualizando convite");
       // Apenas atualiza o convite para accepted
    } else {
       console.error("❌ Erro ao adicionar membro ao aceitar convite:", {
         error: memberError.message,
         code: memberError.code,
         details: memberError.details,
         hint: memberError.hint,
         fullError: JSON.stringify(memberError, Object.getOwnPropertyNames(memberError), 2),
       });
       throw new Error(`Erro ao processar adesão ao workspace: ${memberError.message || 'Erro desconhecido'}`);
    }
  }

  // 4. Atualizar status do convite usando cliente admin (garantia de sucesso)
  const { error: updateError } = await supabaseAdmin
    .from("workspace_invites")
    .update({ status: 'accepted' })
    .eq("id", inviteId);

  if (updateError) {
    console.error("❌ Erro ao atualizar status do convite:", updateError);
    // Não lançamos erro aqui, pois o membro já foi adicionado
    // O convite pode ficar pendente, mas isso não impede o acesso
  }

  // ✅ Limpar cookie pending_invite após aceitar convite com sucesso
  // Previne estado stale se o usuário tentar aceitar novamente
  const cookieStore = await cookies();
  cookieStore.delete('pending_invite');

  // Revalidar caminhos importantes para garantir que o layout encontre os workspaces
  revalidatePath("/", "layout");
  revalidatePath("/home");
  revalidatePath("/settings");
  
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
    try {
        const supabase = await createServerActionClient();
        
        // Verificar autenticação para logs
        const { data: { user } } = await supabase.auth.getUser();
        console.log("🔍 Buscando detalhes do convite:", {
            inviteId,
            isAuthenticated: !!user,
            userEmail: user?.email || "não autenticado",
        });
        
        // Primeiro, tentar buscar o convite básico (sem joins que podem falhar por RLS)
        const { data: inviteData, error: inviteError } = await supabase
            .from("workspace_invites")
            .select("*")
            .eq("id", inviteId)
            .maybeSingle();
            
        if (inviteError) {
            // Melhorar serialização do erro
            const errorInfo: any = {
                inviteId,
                isAuthenticated: !!user,
                userEmail: user?.email || "não autenticado",
            };
            
            // Tentar extrair informações do erro de várias formas
            if (inviteError && typeof inviteError === 'object') {
                errorInfo.errorMessage = inviteError.message || "Sem mensagem";
                errorInfo.errorCode = inviteError.code || "Sem código";
                errorInfo.errorDetails = inviteError.details;
                errorInfo.errorHint = inviteError.hint;
                
                // Tentar serializar o erro completo
                try {
                    errorInfo.fullError = JSON.stringify(inviteError, Object.getOwnPropertyNames(inviteError), 2);
                } catch (e: any) {
                    errorInfo.fullError = String(inviteError);
                    errorInfo.serializeError = e?.message;
                }
                
                // Verificar se é um erro de RLS
                if (inviteError.code === '42501' || inviteError.message?.includes('permission denied') || inviteError.message?.includes('row-level security')) {
                    errorInfo.isRLSError = true;
                    errorInfo.suggestion = "Verifique se a política RLS 'Allow public read of pending invites by id' está ativa e foi aplicada";
                }
            } else {
                errorInfo.unknownError = "Erro objeto está vazio, undefined ou não serializável";
                errorInfo.rawError = String(inviteError);
                errorInfo.errorType = typeof inviteError;
            }
            
            console.error("❌ Erro ao buscar detalhes do convite:", errorInfo);
            return null;
        }
    
        if (!inviteData) {
            console.warn("⚠️ Convite não encontrado:", {
                inviteId,
                isAuthenticated: !!user,
                suggestion: "Verifique se o ID do convite está correto ou se a política RLS permite leitura",
            });
            return null;
        }
        
        console.log("✅ Convite encontrado:", {
            inviteId,
            status: inviteData.status,
            email: inviteData.email,
            expiresAt: inviteData.expires_at,
        });
        
        // Verificar se o convite é válido (pendente e não expirado)
        if (inviteData.status !== 'pending') {
            return inviteData; // Retornar mesmo que não esteja pendente para mostrar status
        }
        
        if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
            console.warn("⚠️ Convite expirado:", {
                inviteId,
                expiresAt: inviteData.expires_at,
                now: new Date().toISOString(),
            });
            return null;
        }
        
        // Tentar buscar informações adicionais (workspace e inviter) se possível
        // Se falhar, retornamos pelo menos os dados básicos do convite
        try {
            const { data: workspaceData } = await supabase
                .from("workspaces")
                .select("name")
                .eq("id", inviteData.workspace_id)
                .maybeSingle();
                
            const { data: inviterData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", inviteData.invited_by)
                .maybeSingle();
            
            // Retornar com informações adicionais se disponíveis
            return {
                ...inviteData,
                workspaces: workspaceData ? { name: workspaceData.name } : null,
                invited_by_profile: inviterData ? { full_name: inviterData.full_name } : null,
            };
        } catch (joinError: any) {
            // Se os joins falharem (por RLS), retornar pelo menos os dados básicos
            console.warn("⚠️ Não foi possível buscar informações adicionais do convite (RLS pode estar bloqueando):", {
                inviteId,
                error: joinError?.message || String(joinError),
                suggestion: "Isso é normal se o usuário não tiver permissão para ver dados do workspace",
            });
            return inviteData;
        }
    } catch (outerError: any) {
        // Capturar erros não relacionados ao Supabase
        console.error("❌ Erro inesperado em getInviteDetails:", {
            inviteId,
            error: outerError?.message || String(outerError),
            stack: outerError?.stack,
        });
        return null;
    }
}

