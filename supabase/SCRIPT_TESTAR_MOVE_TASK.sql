-- ============================================
-- SCRIPT: Testar Função move_task
-- ============================================
-- Execute este script para testar se a função move_task
-- está realmente atualizando as posições no banco
-- ============================================

-- 1. Verificar se a função existe
SELECT 
    'Verificação - move_task existe' as teste,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'move_task'
            AND routine_type = 'FUNCTION'
        ) THEN '✅ Função existe'
        ELSE '❌ Função NÃO existe'
    END as resultado;

-- 2. Buscar uma tarefa de teste (substitua pelo ID de uma tarefa real)
-- Primeiro, vamos listar algumas tarefas disponíveis
SELECT 
    'Tarefas disponíveis para teste' as teste,
    id,
    title,
    position,
    workspace_id,
    created_by
FROM public.tasks
WHERE workspace_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. TESTE MANUAL (Descomente e substitua os valores):
/*
-- Substitua 'TASK_ID_AQUI' pelo ID de uma tarefa real
-- Substitua 'USER_ID_AQUI' pelo seu user_id (auth.uid())

-- 3.1. Verificar posição atual
SELECT 
    'Posição ANTES do teste' as teste,
    id,
    title,
    position
FROM public.tasks
WHERE id = 'TASK_ID_AQUI'::uuid;

-- 3.2. Executar a função (como usuário autenticado)
-- NOTA: Você precisa estar autenticado para executar esta função
-- Execute via API ou como o usuário correto
SELECT public.move_task(
    'TASK_ID_AQUI'::uuid,
    9999.5::DOUBLE PRECISION
);

-- 3.3. Verificar posição DEPOIS do teste
SELECT 
    'Posição DEPOIS do teste' as teste,
    id,
    title,
    position,
    CASE 
        WHEN position = 9999.5 THEN '✅ Posição atualizada corretamente!'
        ELSE '❌ Posição NÃO foi atualizada'
    END as resultado
FROM public.tasks
WHERE id = 'TASK_ID_AQUI'::uuid;
*/

-- 4. Verificar se há tarefas com position NULL ou 0
SELECT 
    'Tarefas com position NULL ou 0' as teste,
    COUNT(*) as quantidade,
    string_agg(id::text, ', ') as task_ids
FROM public.tasks
WHERE position IS NULL OR position = 0;

-- 5. Verificar distribuição de positions
SELECT 
    'Distribuição de positions' as teste,
    workspace_id,
    COUNT(*) as total_tarefas,
    MIN(position) as min_position,
    MAX(position) as max_position,
    AVG(position) as avg_position,
    COUNT(DISTINCT position) as posicoes_unicas
FROM public.tasks
WHERE workspace_id IS NOT NULL
GROUP BY workspace_id
ORDER BY total_tarefas DESC
LIMIT 5;

-- 6. Verificar se há posições duplicadas
SELECT 
    'Posições duplicadas' as teste,
    workspace_id,
    position,
    COUNT(*) as quantidade,
    string_agg(id::text, ', ') as task_ids
FROM public.tasks
WHERE workspace_id IS NOT NULL
    AND position IS NOT NULL
GROUP BY workspace_id, position
HAVING COUNT(*) > 1
ORDER BY quantidade DESC
LIMIT 10;

-- 7. Verificar permissões da função
SELECT 
    'Permissões da função move_task' as teste,
    routine_name,
    security_type,
    CASE 
        WHEN security_type = 'DEFINER' THEN '✅ Usa SECURITY DEFINER (contorna RLS)'
        ELSE '⚠️ Não usa SECURITY DEFINER'
    END as resultado
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';

-- 8. Verificar grants
SELECT 
    'Grants da função move_task' as teste,
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name = 'move_task';

-- 9. INSTRUÇÕES PARA TESTE MANUAL:
-- 
-- Para testar a função manualmente:
-- 1. Pegue o ID de uma tarefa da query #2
-- 2. Pegue seu user_id (SELECT auth.uid();)
-- 3. Verifique se você é membro do workspace da tarefa:
--    SELECT * FROM workspace_members 
--    WHERE workspace_id = 'WORKSPACE_ID' AND user_id = 'SEU_USER_ID';
-- 4. Descomente a seção 3 e substitua os valores
-- 5. Execute a função
-- 6. Verifique se a posição foi atualizada

