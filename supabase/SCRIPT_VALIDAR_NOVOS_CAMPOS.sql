-- ============================================
-- SCRIPT DE VALIDAÇÃO - Novos Campos v2.1
-- Execute este script para verificar se os novos campos foram adicionados
-- ============================================

-- 1. Verificar campo whatsapp em profiles
SELECT 
    'VERIFICAÇÃO - profiles.whatsapp' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'whatsapp'
        ) THEN '✅ Campo whatsapp existe'
        ELSE '❌ Campo whatsapp NÃO existe'
    END as status;

-- 2. Verificar campos de trial/subscription em workspaces
SELECT 
    'VERIFICAÇÃO - workspaces.trial' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workspaces' 
            AND column_name = 'trial_ends_at'
        ) THEN '✅ Campo trial_ends_at existe'
        ELSE '❌ Campo trial_ends_at NÃO existe'
    END as status;

SELECT 
    'VERIFICAÇÃO - workspaces.subscription_status' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workspaces' 
            AND column_name = 'subscription_status'
        ) THEN '✅ Campo subscription_status existe'
        ELSE '❌ Campo subscription_status NÃO existe'
    END as status;

SELECT 
    'VERIFICAÇÃO - workspaces.subscription_id' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workspaces' 
            AND column_name = 'subscription_id'
        ) THEN '✅ Campo subscription_id existe'
        ELSE '❌ Campo subscription_id NÃO existe'
    END as status;

-- 3. Verificar se tasks.status aceita 'review'
SELECT 
    'VERIFICAÇÃO - tasks.status inclui review' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'tasks_status_check'
            AND pg_get_constraintdef(oid) LIKE '%review%'
        ) THEN '✅ Status review está disponível'
        ELSE '❌ Status review NÃO está disponível'
    END as status;

-- 4. Verificar funções auxiliares
SELECT 
    'VERIFICAÇÃO - Função is_trial_active' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'is_trial_active'
        ) THEN '✅ Função is_trial_active existe'
        ELSE '❌ Função is_trial_active NÃO existe'
    END as status;

SELECT 
    'VERIFICAÇÃO - Função has_active_subscription' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'has_active_subscription'
        ) THEN '✅ Função has_active_subscription existe'
        ELSE '❌ Função has_active_subscription NÃO existe'
    END as status;

-- 5. Verificar índices novos
SELECT 
    'VERIFICAÇÃO - Índices novos' as verificação,
    indexname as índice,
    CASE 
        WHEN indexname LIKE '%trial%' OR indexname LIKE '%subscription%' OR indexname LIKE '%status%'
        THEN '✅ Índice novo encontrado'
        ELSE 'Índice padrão'
    END as tipo
FROM pg_indexes
WHERE schemaname = 'public'
AND (
    indexname LIKE '%trial%' 
    OR indexname LIKE '%subscription%'
    OR (indexname LIKE '%status%' AND tablename = 'tasks')
)
ORDER BY indexname;

-- 6. Resumo de todos os novos campos
SELECT 
    'RESUMO - Novos Campos v2.1' as categoria,
    'profiles.whatsapp' as campo,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'whatsapp'
        ) THEN '✅'
        ELSE '❌'
    END as status
UNION ALL
SELECT 
    'RESUMO - Novos Campos v2.1',
    'workspaces.trial_ends_at',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workspaces' 
            AND column_name = 'trial_ends_at'
        ) THEN '✅'
        ELSE '❌'
    END
UNION ALL
SELECT 
    'RESUMO - Novos Campos v2.1',
    'workspaces.subscription_status',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workspaces' 
            AND column_name = 'subscription_status'
        ) THEN '✅'
        ELSE '❌'
    END
UNION ALL
SELECT 
    'RESUMO - Novos Campos v2.1',
    'workspaces.subscription_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workspaces' 
            AND column_name = 'subscription_id'
        ) THEN '✅'
        ELSE '❌'
    END
UNION ALL
SELECT 
    'RESUMO - Novos Campos v2.1',
    'tasks.status (com review)',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'tasks_status_check'
            AND pg_get_constraintdef(oid) LIKE '%review%'
        ) THEN '✅'
        ELSE '❌'
    END;

