/**
 * Funções utilitárias puras para planos e assinaturas
 * Estas funções podem ser usadas em Client Components
 */

/**
 * Retorna os limites do plano baseado no tipo de plano e status
 */
export function getPlanLimits(
  plan: string | null,
  status: string | null
): number {
  // Agency é ilimitado, independente do status
  if (plan === "agency") {
    return 999;
  }

  // Exceção: Se está em trial, sempre usar limite do Business
  if (status === "trialing" || status === "trial") {
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
    case "agency":
      return 999; // Limite alto para planos Agency
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
      return "Pessoal";
    case "pro":
      return "Pro";
    case "business":
      return "Business";
    case "agency":
      return "Agency";
    default:
      return "Pessoal";
  }
}

export function getDisplayPlanName(
  workspacePlan: string | null,
  accountPlan?: string | null
): string {
  if (accountPlan) {
    return getPlanName(accountPlan);
  }
  return getPlanName(workspacePlan);
}

