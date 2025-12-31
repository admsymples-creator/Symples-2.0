// Mapeamento de planos para valores e configurações do Asaas

export interface PlanConfig {
  value: number; // Valor em reais
  name: string;
  description: string;
}

export const PLAN_CONFIGS: Record<'starter' | 'pro' | 'business', PlanConfig> = {
  starter: {
    value: 49.00,
    name: "Starter",
    description: "Plano Starter - Symples",
  },
  pro: {
    value: 69.00,
    name: "Pro",
    description: "Plano Pro - Symples",
  },
  business: {
    value: 129.00,
    name: "Business",
    description: "Plano Business - Symples",
  },
};

