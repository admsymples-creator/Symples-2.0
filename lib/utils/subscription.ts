import { createServerActionClient } from "@/lib/supabase/server";

export interface WorkspaceAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

/**
 * Verifica se o workspace tem acesso permitido para operações de escrita
 * (Soft Lock: leitura permitida, escrita bloqueada se trial expirado)
 * 
 * Esta é uma Server Action - deve ser chamada apenas no servidor
 */
export async function checkWorkspaceAccess(
  workspaceId: string
): Promise<WorkspaceAccessResult> {
  try {
    const supabase = await createServerActionClient();
    
    // Buscar dados do workspace
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("plan, subscription_status, trial_ends_at")
      .eq("id", workspaceId)
      .single();

    if (error || !workspace) {
      return {
        allowed: false,
        reason: "Workspace não encontrado",
      };
    }

    const { subscription_status, trial_ends_at } = workspace;

    // Se está ativo, sempre permitir
    if (subscription_status === "active") {
      return { allowed: true };
    }

    // Verificar se trial expirou
    if (trial_ends_at) {
      const trialEndDate = new Date(trial_ends_at);
      const now = new Date();

      // Se trial expirou E não está ativo, bloquear
      if (trialEndDate < now && subscription_status !== "active") {
        return {
          allowed: false,
          reason: "Seu trial expirou. Escolha um plano para continuar.",
          upgradeRequired: true,
        };
      }
    }

    // Se está em trial ou outro status válido, permitir
    return { allowed: true };
  } catch (error) {
    console.error("Erro ao verificar acesso do workspace:", error);
    return {
      allowed: false,
      reason: "Erro ao verificar permissões",
    };
  }
}

/**
 * Retorna os limites do plano baseado no tipo de plano e status
 */
export function getPlanLimits(
  plan: string | null,
  status: string | null
): number {
  // Exceção: Se está em trial, sempre usar limite do Business
  if (status === "trialing") {
    return 15; // Limite do Business
  }

  // Limites por plano
  switch (plan) {
    case "starter":
      return 1; // Apenas o dono
    case "pro":
      return 5; // Dono + 4 membros
    case "business":
      return 15; // Dono + 14 membros
    default:
      // Fallback: se plano não definido, usar limite mínimo
      return 1;
  }
}

/**
 * Retorna o nome do plano formatado
 */
export function getPlanName(plan: string | null): string {
  switch (plan) {
    case "starter":
      return "Starter";
    case "pro":
      return "Pro";
    case "business":
      return "Business";
    default:
      return "Starter";
  }
}

