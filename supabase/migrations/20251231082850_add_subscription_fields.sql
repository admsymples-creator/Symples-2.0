-- ============================================
-- Adicionar campos de assinatura e planos
-- ============================================

-- Adicionar campo 'plan' na tabela workspaces
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'business' 
CHECK (plan IN ('starter', 'pro', 'business'));

-- Adicionar campo 'member_limit' na tabela workspaces
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS member_limit INTEGER DEFAULT 15;

-- Atualizar subscription_status: remover constraint antiga PRIMEIRO
-- Remover constraint antiga ANTES de atualizar valores
ALTER TABLE public.workspaces
DROP CONSTRAINT IF EXISTS workspaces_subscription_status_check;

-- Agora atualizar valores existentes de 'trial' para 'trialing'
UPDATE public.workspaces
SET subscription_status = 'trialing'
WHERE subscription_status = 'trial';

-- Também atualizar outros valores antigos que podem existir
UPDATE public.workspaces
SET subscription_status = 'canceled'
WHERE subscription_status = 'cancelled';

UPDATE public.workspaces
SET subscription_status = 'canceled'
WHERE subscription_status = 'expired';

-- IMPORTANTE: Tratar workspaces existentes ANTES de marcar NULL como 'trialing'
-- Workspaces criados há mais de 30 dias são considerados "ativos" (já usam o sistema)
-- (Nota: 'trial' já foi atualizado para 'trialing' acima, então verificamos 'trialing' aqui)
UPDATE public.workspaces
SET 
    subscription_status = 'active',
    trial_ends_at = NULL
WHERE created_at < NOW() - INTERVAL '30 days'
  AND (subscription_status IS NULL OR subscription_status = 'trialing');

-- Agora atualizar workspaces novos ou sem subscription_status para 'trialing'
UPDATE public.workspaces
SET subscription_status = 'trialing'
WHERE subscription_status IS NULL;

-- Adicionar nova constraint com valores atualizados
ALTER TABLE public.workspaces
ADD CONSTRAINT workspaces_subscription_status_check 
CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled'));

-- Atualizar default de subscription_status
ALTER TABLE public.workspaces
ALTER COLUMN subscription_status SET DEFAULT 'trialing';

-- Para workspaces mais novos (menos de 30 dias) ou sem trial_ends_at, dar 14 dias
UPDATE public.workspaces
SET trial_ends_at = NOW() + INTERVAL '14 days'
WHERE subscription_status = 'trialing'
  AND (
      trial_ends_at IS NULL 
      OR (trial_ends_at < NOW() AND created_at >= NOW() - INTERVAL '30 days')
  );

-- Comentários para documentação
COMMENT ON COLUMN public.workspaces.plan IS 'Plano de assinatura: starter, pro ou business';
COMMENT ON COLUMN public.workspaces.member_limit IS 'Limite de membros permitidos no workspace baseado no plano';
COMMENT ON COLUMN public.workspaces.subscription_status IS 'Status da assinatura: trialing, active, past_due ou canceled';

