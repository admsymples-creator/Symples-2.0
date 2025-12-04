-- ============================================
-- SCRIPT: Verificar se Posições Estão Sendo Salvas
-- ============================================
-- Este script verifica diretamente no banco se as posições
-- das tarefas estão sendo atualizadas corretamente
-- ============================================

-- 1. Verificar últimas atualizações de posição
SELECT 
    'Últimas Atualizações de Posição' as verificação,
    id,
    title,
    position,
    updated_at,
    workspace_id,
    group_id,
    status,
    CASE 
        WHEN updated_at > NOW() - INTERVAL '5 minutes' THEN '🟢 Atualizado recentemente (< 5 min)'
        WHEN updated_at > NOW() - INTERVAL '1 hour' THEN '🟡 Atualizado há pouco (< 1 hora)'
        ELSE '🔴 Não atualizado recentemente'
    END as status_atualizacao
FROM public.tasks
WHERE position IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;

-- 2. Verificar tarefas com posições duplicadas (pode indicar problema)
SELECT 
    'Tarefas com Posições Duplicadas' as verificação,
    position,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as task_ids,
    STRING_AGG(title, ' | ') as titles
FROM public.tasks
WHERE position IS NOT NULL
  AND workspace_id IS NOT NULL
GROUP BY position, workspace_id
HAVING COUNT(*) > 1
ORDER BY quantidade DESC
LIMIT 10;

-- 3. Verificar tarefas sem posição (pode indicar problema)
SELECT 
    'Tarefas SEM Posição' as verificação,
    COUNT(*) as total_sem_posicao,
    COUNT(CASE WHEN workspace_id IS NOT NULL THEN 1 END) as com_workspace,
    COUNT(CASE WHEN workspace_id IS NULL THEN 1 END) as sem_workspace
FROM public.tasks
WHERE position IS NULL OR position = 0;

-- 4. Verificar distribuição de posições por workspace
SELECT 
    'Distribuição de Posições por Workspace' as verificação,
    workspace_id,
    COUNT(*) as total_tarefas,
    MIN(position) as posicao_minima,
    MAX(position) as posicao_maxima,
    AVG(position) as posicao_media,
    COUNT(DISTINCT position) as posicoes_unicas
FROM public.tasks
WHERE workspace_id IS NOT NULL
  AND position IS NOT NULL
GROUP BY workspace_id
ORDER BY total_tarefas DESC
LIMIT 10;

-- 5. Testar a função move_task diretamente (substitua os valores pelos seus)
-- Descomente e ajuste os valores abaixo para testar:
/*
DO $$
DECLARE
    v_test_task_id UUID := '48a5ef3a-d023-4055-884a-a77631fb3b61'; -- Substitua pelo ID de uma tarefa real
    v_test_position DOUBLE PRECISION := 9999.0;
    v_result JSONB;
    v_old_position DOUBLE PRECISION;
BEGIN
    -- Buscar posição atual
    SELECT position INTO v_old_position
    FROM public.tasks
    WHERE id = v_test_task_id;
    
    RAISE NOTICE 'Posição ANTES: %', v_old_position;
    
    -- Chamar a função
    SELECT public.move_task(v_test_task_id, v_test_position) INTO v_result;
    
    RAISE NOTICE 'Resultado da RPC: %', v_result;
    
    -- Verificar posição depois
    SELECT position INTO v_old_position
    FROM public.tasks
    WHERE id = v_test_task_id;
    
    RAISE NOTICE 'Posição DEPOIS: %', v_old_position;
    
    IF v_old_position = v_test_position THEN
        RAISE NOTICE '✅ SUCESSO: Posição foi atualizada corretamente!';
    ELSE
        RAISE WARNING '❌ ERRO: Posição NÃO foi atualizada! Esperado: %, Atual: %', v_test_position, v_old_position;
    END IF;
END $$;
*/

-- 6. Verificar se a função move_task está retornando JSONB
SELECT 
    'Verificação da Função move_task' as verificação,
    routine_name,
    data_type as return_type,
    CASE 
        WHEN data_type = 'jsonb' THEN '✅ Retorna JSONB (versão correta)'
        WHEN data_type = 'void' THEN '❌ Retorna VOID (versão antiga - precisa atualizar)'
        ELSE '⚠️ Tipo desconhecido: ' || data_type
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';

-- 7. Verificar se a função move_tasks_bulk existe e retorna JSONB
SELECT 
    'Verificação da Função move_tasks_bulk' as verificação,
    routine_name,
    data_type as return_type,
    CASE 
        WHEN data_type = 'jsonb' THEN '✅ Retorna JSONB (versão correta)'
        WHEN data_type = 'void' THEN '❌ Retorna VOID (versão antiga - precisa atualizar)'
        ELSE '⚠️ Tipo desconhecido: ' || data_type
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_tasks_bulk'
AND routine_type = 'FUNCTION';

-- 8. Verificar RLS policies na tabela tasks
SELECT 
    'Verificação de RLS Policies' as verificação,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'tasks'
ORDER BY policyname;

