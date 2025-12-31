"use server";

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

