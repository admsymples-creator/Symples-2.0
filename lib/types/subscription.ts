/**
 * Tipos relacionados a assinaturas e planos
 */

export interface SubscriptionData {
  id: string;
  plan: 'starter' | 'pro' | 'business' | 'agency' | null;
  account_plan?: 'agency' | null;
  subscription_status: 'trialing' | 'trial' | 'active' | 'past_due' | 'canceled' | null;
  subscription_id: string | null;
  trial_ends_at: string | null;
  member_limit: number | null;
}

