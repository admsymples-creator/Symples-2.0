"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { clearUserWorkspacesCache } from "@/lib/actions/user";
import { createNotification } from "@/lib/actions/notifications";

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

async function revalidateWorkspaceTeamPaths(workspaceId: string) {
  revalidatePath("/settings");
  revalidatePath("/team");

  try {
    const supabase = await createServerActionClient();
    const { data, error } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar slug para revalidatePath:", error);
      return;
    }

    const slugOrId = data?.slug || workspaceId;
    revalidatePath(`/${slugOrId}/team`);
  } catch (error) {
    console.error("Erro ao revalidar rota de time:", error);
  }
}

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
 * OTIMIZADO: Usa cache do React para evitar fetches duplicados
 */
export const getWorkspaceMembers = cache(async (workspaceId: string) => {
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
});

/**
 * Busca convites pendentes de um workspace
 * OTIMIZADO: Usa cache do React para evitar fetches duplicados
 */
export const getPendingInvites = cache(async (workspaceId: string) => {
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
});

/**
 * Envia um convite para um novo membro
 */
export async function inviteMember(workspaceId: string, email: string, role: "admin" | "member" | "viewer") {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    const fail = (message: string, code?: string) => ({ success: false, error: message, code });
    const debugInvites = process.env.DEBUG_INVITES === "1";

    if (!user) return fail("Nao autenticado", "not_authenticated");

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
      return fail("Erro ao verificar permissoes.", "permission_check_failed");
    }

    if (!memberData || (memberData.role !== "owner" && memberData.role !== "admin")) {
      return fail("Permissao negada. Apenas admins podem convidar.", "permission_denied");
    }

    // 1.5. Verificar limites de membros do plano
    const { data: profileData } = await supabase
      .from("profiles")
      .select("account_plan")
      .eq("id", user.id)
      .single();

    const hasAgencyAccount = (profileData as any)?.account_plan === "agency";
    const { data: workspaceData, error: workspaceError } = await supabase
      .from("workspaces")
      .select("plan, subscription_status, name")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspaceData) {
      return fail("Erro ao buscar informacoes do workspace.", "workspace_not_found");
    }

    // Contar membros atuais
    const { count: currentMembersCount, error: countError } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (countError) {
      return fail("Erro ao contar membros do workspace.", "member_count_failed");
    }

    const hasAgencyPlan = workspaceData.plan === "agency";
    if (!hasAgencyAccount && !hasAgencyPlan) {
      // Obter limite do plano
      const { getPlanLimits, getPlanName } = await import("@/lib/utils/subscription-helpers");
      const planLimit = getPlanLimits(workspaceData.plan, workspaceData.subscription_status);
      const planName = getPlanName(workspaceData.plan);

      // Verificar se atingiu o limite
      if (currentMembersCount !== null && currentMembersCount >= planLimit) {
        return fail(`Limite de membros atingido para o plano ${planName} (${planLimit} membro${planLimit > 1 ? 's' : ''}). ` + "Upgrade necessario para adicionar mais membros. Acesse /billing para ver os planos disponiveis.", "member_limit_reached");
      }
    }

    // 2. Normalizar email e verificar se usuário já existe
    const normalizedEmail = email.toLowerCase().trim();
    if (debugInvites) {
      console.log("[inviteMember] start", {
        workspaceId,
        email,
        normalizedEmail,
        userId: user.id,
        role,
      });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return fail("Email invalido.", "invalid_email");
    }

    // Validação de workspaceId
    if (!workspaceId || typeof workspaceId !== 'string') {
      return fail("Workspace ID invalido.", "invalid_workspace");
    }

    // 3. Verificar se o usuário já é membro do workspace
    // Buscar o ID do usuário pelo email (se existir no banco) para verificar membership
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Se o usuário existe, verificar se já é membro
    if (existingProfile) {
      const { data: isMember } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (debugInvites) {
        console.log("[inviteMember] membership check", {
          workspaceId,
          existingProfileId: existingProfile.id,
          isMember: !!isMember,
        });
      }

      if (isMember) {
        return fail("Este usuario ja e membro do workspace.", "already_member");
      }
    }

    // 4. Verificar se já existe convite pendente (ou qualquer convite com esse email)
    // ✅ SEGURANÇA: Sempre criar convite pendente, mesmo para usuários existentes
    // Isso garante consentimento explícito antes de adicionar ao workspace
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
      if (debugInvites) {
        console.log("[inviteMember] existing invite", {
          workspaceId,
          inviteId: existingInvite.id,
          status: existingInvite.status,
        });
      }
      if (existingInvite.status === 'pending') {
        return fail("Ja existe um convite pendente para este email. Voce pode cancelar o convite existente antes de criar um novo.", "invite_pending");
      } else if (existingInvite.status === 'accepted') {
        // ✅ CORREÇÃO: Se o convite foi aceito, verificar se o usuário ainda é membro
        // Se não for mais membro (foi removido), permitir criar novo convite
        if (existingProfile) {
          const { data: stillMember } = await supabase
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspaceId)
            .eq("user_id", existingProfile.id)
            .maybeSingle();

          if (stillMember) {
            // Ainda é membro - não permitir novo convite
            return fail("Este email ja foi aceito neste workspace. O usuario ja e membro.", "already_member");
          } else {
            // Não é mais membro - limpar convite antigo e permitir criar novo
            console.log("🔄 Convite aceito encontrado, mas usuário não é mais membro. Limpando convite antigo para permitir reinvite:", existingInvite.id);

            // Deletar o convite antigo (accepted) para permitir criar novo
            const { error: deleteError } = await supabase
              .from("workspace_invites")
              .delete()
              .eq("id", existingInvite.id);

            if (deleteError) {
              console.error("❌ Erro ao excluir convite aceito antigo:", deleteError);
              return fail("Erro ao limpar convite antigo. Tente novamente.", "invite_cleanup_failed");
            }

            console.log("✅ Convite aceito antigo removido. Prosseguindo com criação do novo convite.");
            // Continuar o fluxo normalmente para criar o novo convite
          }
        } else {
          // Não encontrou perfil do usuário - pode ser que o convite seja de um email que nunca foi usado
          // Nesse caso, deletar o convite aceito antigo e permitir criar novo
          console.log("🔄 Convite aceito encontrado, mas usuário não existe. Limpando convite antigo:", existingInvite.id);

          const { error: deleteError } = await supabase
            .from("workspace_invites")
            .delete()
            .eq("id", existingInvite.id);

          if (deleteError) {
            console.error("❌ Erro ao excluir convite aceito antigo:", deleteError);
            return fail("Erro ao limpar convite antigo. Tente novamente.", "invite_cleanup_failed");
          }

          console.log("✅ Convite aceito antigo removido. Prosseguindo com criação do novo convite.");
        }
      } else if (existingInvite.status === 'cancelled') {
        // Se o convite foi cancelado, excluir o registro antigo antes de criar um novo
        console.log("🗑️ Excluindo convite cancelado antes de criar novo:", existingInvite.id);
        const { error: deleteError } = await supabase
          .from("workspace_invites")
          .delete()
          .eq("id", existingInvite.id);

        if (deleteError) {
          console.error("❌ Erro ao excluir convite cancelado:", deleteError);
          return fail("Erro ao limpar convite cancelado. Tente novamente.", "invite_cleanup_failed");
        }

        // Continuar o fluxo normalmente para criar o novo convite
        console.log("✅ Convite cancelado removido. Prosseguindo com criação do novo convite.");
      } else {
        return fail("Ja existe um convite para este email (status: " + existingInvite.status + "). Voce pode cancelar o convite existente antes de criar um novo.", "invite_exists");
      }
    }

    // 5. Buscar informações do usuário que está convidando
    // (workspaceData já foi buscado acima)

    const { data: inviterProfile, error: inviterError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (inviterError && inviterError.code !== 'PGRST116') {
      console.error("Erro ao buscar perfil do inviter:", inviterError);
      // Não falhamos o fluxo, apenas logamos - podemos continuar sem o nome
    }

    // 6. Criar o convite (unificado para novos e existentes)
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
        return fail("Ja existe um convite para este email neste workspace. Verifique a lista de convites pendentes.", "invite_duplicate");
      }

      return fail(`Erro ao criar convite: ${insertError.message || 'Erro desconhecido'}`, "invite_insert_failed");
    }

    if (!newInvite || !newInvite.id) {
      console.error("❌ Convite criado mas não retornou ID:", { newInvite });
      return fail("Erro ao criar convite: ID nao foi retornado.", "invite_missing_id");
    }

    // 7. Gerar link de convite
    // ✅ UNIFICADO: Todos os convites usam /invite/[token]
    // A página de convite detecta se o usuário está logado e mostra UI apropriada
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;

    // Em produção/preview, validar que a URL está configurada
    if (process.env.NODE_ENV !== "development" && !baseUrl) {
      console.error("❌ NEXT_PUBLIC_SITE_URL ou VERCEL_URL não configurada em produção/preview");
      return fail("NEXT_PUBLIC_SITE_URL nao esta configurada. Configure a variavel de ambiente no Vercel.", "missing_site_url");
    }

    // Fallback para desenvolvimento
    if (!baseUrl) {
      baseUrl = "http://localhost:3000";
    }

    const finalUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const inviteLink = `${finalUrl}/invite/${newInvite.id}`;

    console.log("🔗 Link de convite gerado:", {
      baseUrl,
      finalUrl,
      inviteLink,
      environment: process.env.NODE_ENV,
    });

    // 7.5. Notificacao interna para usuarios existentes (nao falhar o fluxo se der erro)
    if (existingProfile?.id) {
      try {
        await createNotification({
          recipientId: existingProfile.id,
          triggeringUserId: user.id,
          category: "admin",
          resourceType: "member",
          resourceId: newInvite.id,
          title: `${inviterProfile?.full_name || "Alguem"} convidou voce para ${workspaceData?.name || "um workspace"}`,
          content: `Voce foi convidado como ${role}`,
          actionUrl: `/invite/${newInvite.id}`,
          metadata: {
            invite_id: newInvite.id,
            workspace_id: workspaceId,
            workspace_name: workspaceData?.name || undefined,
            role,
          },
        });
      } catch (notificationError: any) {
        console.error("Erro ao criar notificacao de convite:", notificationError);
      }
    }

    // 8. Enviar email de convite via Resend
    // ✅ DIFERENCIAÇÃO: Email diferente para usuários novos vs existentes
    const isNewUser = !existingProfile;

    let emailSent = false;
    let emailError: string | null = null;

    console.log("📧 Iniciando envio de email de convite:", {
      to: normalizedEmail,
      workspaceId: workspaceId,
      inviteId: newInvite.id,
      isNewUser,
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
        isNewUser, // ✅ CORRIGIDO: Usa o valor real baseado em existingProfile
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

        // Em produção/preview, se o email falhar, lançar erro para não silenciar
        if (process.env.NODE_ENV !== "development") {
          return fail(emailError || "Falha ao enviar email de convite", "email_failed");
        }
      }
    } catch (err: any) {
      emailError = err.message || "Erro desconhecido ao enviar email";
      console.error("❌ Erro ao enviar email de convite:", {
        to: normalizedEmail,
        inviteId: newInvite.id,
        error: emailError,
        stack: err.stack,
        fullError: JSON.stringify(err, null, 2),
        environment: process.env.NODE_ENV,
        hasApiKey: !!process.env.RESEND_API_KEY,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "não configurado",
      });

      // Em produção/preview, lançar erro para não silenciar o problema
      // Em desenvolvimento, permitir continuar sem email (para facilitar testes)
      if (process.env.NODE_ENV !== "development") {
        return fail(`Falha ao enviar email de convite: ${emailError}. Verifique se RESEND_API_KEY esta configurada no Vercel.`, "email_failed");
      }
    }

    await revalidateWorkspaceTeamPaths(workspaceId);

    return {
      success: true,
      inviteLink: inviteLink, // ✅ Sempre retornar o link para permitir copiar
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
    return { success: false, error: error?.message || "Erro ao processar convite.", code: "unexpected_error" };
  }
}

/**
 * Revoga (cancela) um convite
 */
export async function revokeInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
    const fail = (message: string, code?: string) => ({ success: false, error: message, code });

    if (!user) return fail("Nao autenticado", "not_authenticated");

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

  await revalidateWorkspaceTeamPaths(invite.workspace_id);
  return { success: true };
}

/**
 * Reenvia um convite por email
 * IMPORTANTE: Não auto-adiciona o usuário. Respeita o fluxo de consentimento.
 */
export async function resendInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
    const fail = (message: string, code?: string) => ({ success: false, error: message, code });

    if (!user) return fail("Nao autenticado", "not_authenticated");

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

  // ✅ CORREÇÃO: Resetar expires_at para +7 dias a partir de agora
  // Manter status como 'pending' (não alterar)
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Usar supabaseAdmin para garantir que a atualização funcione mesmo com RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY não configurada");
    throw new Error("Configuração do servidor inválida. Contate o suporte.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Atualizar expires_at mantendo status como pending
  const { error: updateError } = await supabaseAdmin
    .from("workspace_invites")
    .update({
      expires_at: newExpiresAt,
      // Garantir que o status permanece 'pending'
      status: 'pending'
    })
    .eq("id", inviteId);

  if (updateError) {
    console.error("Erro ao atualizar expires_at do convite:", updateError);
    throw new Error("Erro ao atualizar convite");
  }

  // Gerar link de convite
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;

  // Em produção/preview, validar que a URL está configurada
  if (process.env.NODE_ENV !== "development" && !baseUrl) {
    console.error("❌ NEXT_PUBLIC_SITE_URL ou VERCEL_URL não configurada em produção/preview");
    return fail("NEXT_PUBLIC_SITE_URL nao esta configurada. Configure a variavel de ambiente no Vercel.", "missing_site_url");
  }

  // Fallback para desenvolvimento
  if (!baseUrl) {
    baseUrl = "http://localhost:3000";
  }

  const finalUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const inviteLink = `${finalUrl}/invite/${inviteId}`;

  // Reenviar email de convite
  try {
    await sendInviteEmail({
      to: invite.email,
      workspaceName: (invite.workspaces as any)?.name || "Workspace",
      inviterName: (invite.invited_by_profile as any)?.full_name || null,
      inviteLink,
      role: invite.role as "admin" | "member" | "viewer",
    });
  } catch (emailError: any) {
    console.error("❌ Erro ao reenviar email de convite:", {
      error: emailError.message,
      inviteId,
      to: invite.email,
      environment: process.env.NODE_ENV,
      hasApiKey: !!process.env.RESEND_API_KEY,
    });
    throw new Error(`Erro ao reenviar email: ${emailError.message}`);
  }

  await revalidateWorkspaceTeamPaths(invite.workspace_id);
  return { success: true, message: "Convite reenviado com sucesso!" };
}

/**
 * Remove um membro do workspace
 * Security: Verifica permissoes (owner/admin), previne auto-remocao, valida hierarquia
 * Audit: Registra a acao em audit_logs
 * Safety: Alerta se for o ultimo admin sendo removido
 */
export async function removeMember(workspaceId: string, userId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  const debugInvites = process.env.DEBUG_INVITES === "1";

  if (!user) {
    return { success: false, error: "Nao autenticado" };
  }

  // SECURITY: Verificar se o usuario esta tentando remover a si mesmo
  if (user.id === userId) {
    return {
      success: false,
      error: "Voce nao pode remover a si mesmo do workspace. Use a opcao 'Deixar workspace' se desejar sair."
    };
  }

  // SECURITY: Verificar permissoes do usuario atual (owner ou admin)
  const { data: currentMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
    return { success: false, error: "Permissao negada. Apenas admins podem remover membros." };
  }

  // Verificar dados do membro a ser removido
  const { data: targetMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!targetMember) {
    return {
      success: true,
      warning: "Membro ja havia sido removido ou nao existe no workspace."
    };
  }

  // SECURITY: Apenas owner pode remover outro owner
  if (targetMember.role === "owner" && currentMember.role !== "owner") {
    return { success: false, error: "Apenas o owner pode remover outro owner." };
  }

  // SAFETY: Verificar se e o ultimo admin sendo removido
  // Buscar todos os admins do workspace (owner + admin)
  const { data: allAdmins, error: adminsError } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId)
    .in("role", ["owner", "admin"]);

  if (adminsError) {
    console.error("Erro ao verificar admins:", adminsError);
    // Nao bloquear a remocao por causa disso, apenas logar
  }

  const isLastAdmin = allAdmins && allAdmins.length === 1 && allAdmins[0].user_id === userId;
  if (isLastAdmin && targetMember.role === "admin") {
    // Permitir a remocao, mas registrar aviso (sera retornado na resposta)
    console.warn("ATENCAO: Removendo o ultimo admin do workspace. Workspace ficara sem admins!");
  }

  // Usar supabaseAdmin para garantir que a remocao funcione mesmo com RLS restritivo
  const supabaseAdmin = await createServiceRoleClient();

  // AUDIT: Registrar a acao antes de remover
  try {
    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id || null, // Quem executou a acao (pode ser null em edge cases)
        action: "removed_member",
        details: {
          removed_user_id: userId,
          removed_user_role: targetMember.role,
          was_last_admin: isLastAdmin || false,
        },
      });

    if (auditError) {
      console.error("Erro ao registrar audit log (nao bloqueia remocao):", auditError);
      // Nao bloqueamos a remocao se o audit log falhar
    }
  } catch (auditErr: any) {
    console.error("Erro ao registrar audit log:", auditErr);
    // Continuar mesmo se audit log falhar
  }

  // LOGIC: Remover membro (nao deleta de auth.users ou profiles)
  if (debugInvites) {
    console.log("[removeMember] delete request", {
      workspaceId,
      userId,
      requestedBy: user?.id || null,
    });
  }

  const { data: deletedRows, error } = await supabaseAdmin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    console.error("Erro ao remover membro:", error);
    return { success: false, error: "Erro ao remover membro" };
  }
  if (!deletedRows || deletedRows.length === 0) {
    if (debugInvites) {
      console.warn("[removeMember] no rows deleted", {
        workspaceId,
        userId,
      });
    }
    console.warn("Remocao solicitada, mas nenhum membro foi removido:", {
      workspaceId,
      userId,
    });
    return { success: false, error: "Membro nao encontrado para remocao" };
  }

  await revalidateWorkspaceTeamPaths(workspaceId);

  return {
    success: true,
    warning: isLastAdmin ? "Atencao: Este era o ultimo admin do workspace. O workspace ficara sem administradores." : undefined,
  };
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
    const fail = (message: string, code?: string) => ({ success: false, error: message, code });

    if (!user) return fail("Nao autenticado", "not_authenticated");

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

  await revalidateWorkspaceTeamPaths(workspaceId);
  return { success: true };
}

/**
 * Aceita um convite
 */
// Internal core to share logic between server and client callers.
async function acceptInviteCore(
  inviteId: string,
  user: { id: string; email?: string | null },
  supabase: Awaited<ReturnType<typeof createServerActionClient>>
) {
// 1. VALIDAÇÃO: Buscar convite usando cliente normal (validações de RLS e email)
  // Tentamos ler com o cliente normal primeiro para garantir que o usuário tem permissão
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  let inviteData = invite;
  if (inviteError || !inviteData) {
    const supabaseAdmin = await createServiceRoleClient();
    const { data: adminInvite, error: adminInviteError } = await supabaseAdmin
      .from("workspace_invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (adminInviteError || !adminInvite) {
      throw new Error("Convite inv?lido ou n?o encontrado.");
    }

    inviteData = adminInvite;
  }

  if (inviteData.status !== 'pending') {
    throw new Error("Este convite não está mais pendente.");
  }

  // Validar se o email do usuário logado bate com o convite
  if (inviteData.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new Error(`Este convite foi enviado para ${inviteData.email}, mas você está logado como ${user.email}.`);
  }

  // Validar se o convite não expirou
  if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
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
      workspace_id: inviteData.workspace_id,
      user_id: user.id,
      role: inviteData.role
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

  // ✅ MULTI-TENANCY: Definir workspace ativo após aceitar convite
  // O workspace ativo é gerenciado via localStorage no cliente (SidebarProvider),
  // mas podemos criar um cookie que será lido pelo cliente para atualizar o contexto
  // Isso garante que ao redirecionar para /home, o novo workspace será ativo
  cookieStore.set('newly_accepted_workspace_id', inviteData.workspace_id, {
    httpOnly: false, // Precisamos que o cliente possa ler
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60, // 1 minuto (suficiente para o cliente ler e atualizar)
    path: '/',
  });
  cookieStore.set('active_workspace_id', inviteData.workspace_id, {
    httpOnly: false, // Mantem compatibilidade com atualizacao no cliente
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: '/',
  });

  // Limpar cache de workspaces do usuário para forçar recarregamento
  await clearUserWorkspacesCache(user.id);
  
  // Revalidar caminhos importantes para garantir que o layout encontre os workspaces
    revalidatePath("/", "layout");
    revalidatePath("/(main)", "layout");
    revalidatePath("/home");
    revalidatePath("/settings");

  // ✅ Buscar slug do workspace para redirecionar diretamente
  // Isso evita race condition onde o usuário é redirecionado para /home antes
  // da propagação do banco de dados, o que causava redirect falso para onboarding
  // Usar supabaseAdmin para garantir que a busca funcione mesmo com cache/RLS
  const { data: workspaceData, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('slug')
    .eq('id', inviteData.workspace_id)
    .single();

  if (workspaceError) {
    console.error("❌ Erro ao buscar slug do workspace:", {
      workspaceId: inviteData.workspace_id,
      error: workspaceError.message,
      code: workspaceError.code,
    });
  }

  const workspaceSlug = workspaceData?.slug || null;

  if (!workspaceSlug) {
    console.warn("⚠️ Workspace slug não encontrado para workspace:", inviteData.workspace_id);
  }

  console.log("✅ Convite aceito com sucesso:", {
    inviteId,
    workspaceId: inviteData.workspace_id,
    workspaceSlug,
    userId: user.id,
  });

  return {
    success: true,
    workspaceId: inviteData.workspace_id,
    workspaceSlug, // ✅ Retornar slug para redirecionamento direto
  };
}

/**
 * Aceita um convite
 */
export async function acceptInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Se n?o estiver logado, redirecionar para login com callback
    redirect(`/login?next=/invite/${inviteId}`);
  }

  return acceptInviteCore(inviteId, user, supabase);
}

/**
 * Aceita um convite (client-safe)
 */
export async function acceptInviteClient(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "not_authenticated" };
  }

  try {
    return await acceptInviteCore(inviteId, user, supabase);
  } catch (error: any) {
    console.error("Erro ao aceitar convite (client-safe):", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      digest: error?.digest,
    });
    return { success: false, error: error?.message || "Erro ao aceitar convite" };
  }
}

export async function declineInvite(inviteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nao autenticado");
  }

  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    throw new Error("Convite invalido ou nao encontrado.");
  }

  if (invite.status !== "pending") {
    throw new Error("Este convite nao esta mais pendente.");
  }

  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new Error(`Este convite foi enviado para ${invite.email}, mas voce esta logado como ${user.email}.`);
  }

  const supabaseAdmin = await createServiceRoleClient();
  const { error: updateError } = await supabaseAdmin
    .from("workspace_invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId);

  if (updateError) {
    console.error("Erro ao recusar convite:", updateError);
    throw new Error("Erro ao recusar convite.");
  }

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
    const { data: inviteDataRaw, error: inviteError } = await supabase
      .from("workspace_invites")
      .select("*")
      .eq("id", inviteId)
      .maybeSingle();

    let inviteData = inviteDataRaw;

    if (inviteError || !inviteData) {
      if (!user) {
        return null;
      }

      try {
        const supabaseAdmin = await createServiceRoleClient();
        const { data: adminInvite, error: adminInviteError } = await supabaseAdmin
          .from("workspace_invites")
          .select("*")
          .eq("id", inviteId)
          .maybeSingle();

        if (adminInviteError || !adminInvite) {
          console.error("? Erro ao buscar convite com admin:", {
            inviteId,
            error: adminInviteError?.message || "Sem mensagem",
          });
          return null;
        }

        inviteData = adminInvite;
      } catch (adminError: any) {
        console.error("? Erro ao buscar convite com admin:", {
          inviteId,
          error: adminError?.message || String(adminError),
        });
        return null;
      }
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
        .eq("id", inviteData.invited_by || '')
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










