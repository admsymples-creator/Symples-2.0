-- ============================================
-- Correção Completa: Marcar TODOS os workspaces antigos como 'active'
-- ============================================
-- Este script corrige workspaces que foram criados há mais de 30 dias
-- e que ainda estão com status 'trialing' (não deveriam ver banner de trial)

-- Workspaces criados há mais de 30 dias devem ser 'active' (não trial)
UPDATE public.workspaces
SET 
    subscription_status = 'active',
    trial_ends_at = NULL
WHERE created_at < NOW() - INTERVAL '30 days'
  AND subscription_status = 'trialing';

-- Log: Mostrar quantos workspaces foram corrigidos
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Workspaces corrigidos: %', updated_count;
END $$;

-- Comentário: Workspaces antigos que já usam o sistema há mais de 30 dias
-- são considerados clientes ativos e não devem ver o banner de trial

