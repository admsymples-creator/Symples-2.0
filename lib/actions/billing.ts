"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { asaasClient } from "@/lib/integrations/asaas/client";
import { PLAN_CONFIGS } from "@/lib/integrations/asaas/plans";
import type { AsaasCustomer } from "@/lib/integrations/asaas/types";
import type { SubscriptionData } from "@/lib/types/subscription";

/**
 * Busca dados da assinatura atual do workspace
 */
export async function getCurrentSubscription(
  workspaceId: string
): Promise<SubscriptionData | null> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se usuário é membro do workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      throw new Error("Workspace não encontrado ou sem permissão");
    }

    // Buscar dados de subscription
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("id, plan, subscription_status, subscription_id, trial_ends_at, member_limit")
      .eq("id", workspaceId)
      .single();

    if (error || !workspace) {
      console.error("Erro ao buscar subscription:", error);
      return null;
    }

    return {
      id: workspace.id,
      plan: workspace.plan as 'starter' | 'pro' | 'business' | null,
      subscription_status: workspace.subscription_status as 'trialing' | 'active' | 'past_due' | 'canceled' | null,
      subscription_id: workspace.subscription_id,
      trial_ends_at: workspace.trial_ends_at,
      member_limit: workspace.member_limit,
    };
  } catch (error) {
    console.error("Erro ao buscar subscription:", error);
    return null;
  }
}

/**
 * Atualiza o plano do workspace e cria assinatura no Asaas
 */
export async function updateSubscription(
  workspaceId: string,
  plan: 'starter' | 'pro' | 'business',
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" = "PIX"
): Promise<{ success: boolean; error?: string; subscriptionId?: string; checkoutUrl?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    // Verificar se usuário é owner/admin do workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return { success: false, error: "Apenas owners e admins podem alterar o plano" };
    }

    // Buscar dados do workspace e usuário
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, subscription_id")
      .eq("id", workspaceId)
      .single();

    if (!workspace) {
      return { success: false, error: "Workspace não encontrado" };
    }

    // Buscar dados do perfil do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, whatsapp")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Perfil do usuário não encontrado" };
    }

    // Obter limites do novo plano
    const { getPlanLimits } = await import("@/lib/utils/subscription-helpers");
    const { data: currentWorkspace } = await supabase
      .from("workspaces")
      .select("subscription_status")
      .eq("id", workspaceId)
      .single();

    const memberLimit = getPlanLimits(plan, currentWorkspace?.subscription_status || null);
    const planConfig = PLAN_CONFIGS[plan];

    // Se já existe assinatura no Asaas, cancelar antes de criar nova
    if (workspace.subscription_id) {
      try {
        await asaasClient.cancelSubscription(workspace.subscription_id);
      } catch (error) {
        console.warn("Erro ao cancelar assinatura antiga (pode não existir):", error);
      }
    }

    // Criar ou atualizar cliente no Asaas
    const customerData: AsaasCustomer = {
      name: profile.full_name || workspace.name,
      email: profile.email,
      phone: profile.whatsapp || undefined,
    };

    const customerId = await asaasClient.createOrUpdateCustomer(customerData);

    // Calcular próxima data de vencimento (1 mês a partir de hoje)
    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Criar assinatura no Asaas
    const subscription = await asaasClient.createSubscription({
      customer: customerId,
      billingType,
      value: planConfig.value,
      nextDueDate: nextDueDateStr,
      cycle: "MONTHLY",
      description: planConfig.description,
      externalReference: workspaceId, // ID do workspace para identificar no webhook
    });

    // Atualizar workspace com dados da assinatura
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({
        plan,
        member_limit: memberLimit,
        subscription_id: subscription.id,
        subscription_status: subscription.status === "ACTIVE" ? "active" : "trialing",
        // Manter trial_ends_at se ainda estiver em trial, senão limpar
        trial_ends_at: subscription.status === "ACTIVE" ? null : undefined,
      })
      .eq("id", workspaceId);

    if (updateError) {
      console.error("Erro ao atualizar workspace:", updateError);
      return { success: false, error: "Erro ao atualizar plano no banco de dados" };
    }

    // Retornar URL de checkout se for necessário (para cartão de crédito)
    let checkoutUrl: string | undefined;
    if (billingType === "CREDIT_CARD") {
      // O Asaas retorna a URL de checkout no response, mas pode precisar ser construída
      // Por enquanto, retornamos o ID da assinatura para o frontend redirecionar
      checkoutUrl = `https://www.asaas.com/c/${subscription.id}`;
    }

    return {
      success: true,
      subscriptionId: subscription.id,
      checkoutUrl,
    };
  } catch (error: any) {
    console.error("Erro ao criar assinatura no Asaas:", error);
    return {
      success: false,
      error: error.message || "Erro ao processar assinatura. Tente novamente.",
    };
  }
}

