-- ============================================
-- Correção: Marcar workspaces antigos como 'active'
-- ============================================
-- Este script corrige workspaces que foram criados há mais de 30 dias
-- e que foram incorretamente marcados como 'trialing' na migration anterior

-- Workspaces criados há mais de 30 dias devem ser 'active' (não trial)
UPDATE public.workspaces
SET 
    subscription_status = 'active',
    trial_ends_at = NULL
WHERE created_at < NOW() - INTERVAL '30 days'
  AND subscription_status = 'trialing';

-- Comentário: Workspaces antigos que já usam o sistema há mais de 30 dias
-- são considerados clientes ativos e não devem ver o banner de trial

