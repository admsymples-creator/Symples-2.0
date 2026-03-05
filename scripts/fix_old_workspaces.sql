-- ============================================
-- Script de Correção Rápida: Workspaces Antigos
-- ============================================
-- Execute este script no Supabase SQL Editor para corrigir workspaces antigos
-- que ainda estão mostrando o banner de trial

-- 1. Verificar workspaces que serão corrigidos
SELECT 
    id,
    name,
    created_at,
    subscription_status,
    trial_ends_at,
    plan,
    NOW() - created_at AS idade_workspace
FROM public.workspaces
WHERE created_at < NOW() - INTERVAL '30 days'
  AND subscription_status = 'trialing'
ORDER BY created_at DESC;

-- 2. Corrigir workspaces antigos (descomente para executar)
-- UPDATE public.workspaces
-- SET 
--     subscription_status = 'active',
--     trial_ends_at = NULL
-- WHERE created_at < NOW() - INTERVAL '30 days'
--   AND subscription_status = 'trialing';

-- 3. Verificar resultado
-- SELECT 
--     id,
--     name,
--     created_at,
--     subscription_status,
--     trial_ends_at
-- FROM public.workspaces
-- WHERE created_at < NOW() - INTERVAL '30 days'
-- ORDER BY created_at DESC;

