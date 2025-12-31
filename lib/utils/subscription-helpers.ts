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

