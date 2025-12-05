-- ============================================
-- SCRIPT DE DIAGNÓSTICO: Ordem das Tarefas
-- ============================================
-- Execute este script no SQL Editor do Supabase para diagnosticar problemas
-- com o salvamento da ordem das tarefas.

-- ============================================
-- 1. VERIFICAÇÕES BÁSICAS
-- ============================================

-- 1.1. Verificar se RLS está habilitado na tabela tasks
SELECT 
    'RLS Status' as verificação,
    tablename,
    CASE WHEN rowsecurity THEN '✅ HABILITADO' ELSE '❌ DESABILITADO' END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tasks';

-- 1.2. Verificar se a coluna position existe e seu tipo
SELECT 
    'Coluna Position' as verificação,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'position';

-- 1.3. Verificar índices na coluna position
SELECT 
    'Índices Position' as verificação,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'tasks' 
    AND indexdef LIKE '%position%';

-- ============================================
-- 2. VERIFICAÇÕES DE RLS POLICIES
-- ============================================

-- 2.1. Listar todas as políticas RLS de UPDATE na tabela tasks
SELECT 
    'Políticas RLS UPDATE' as verificação,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'tasks' 
    AND cmd = 'UPDATE'
ORDER BY policyname;

-- 2.2. Verificar se há políticas conflitantes ou duplicadas
SELECT 
    'Políticas Duplicadas' as verificação,
    policyname,
    COUNT(*) as quantidade
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'tasks' 
    AND cmd = 'UPDATE'
GROUP BY policyname
HAVING COUNT(*) > 1;

-- ============================================
-- 3. VERIFICAÇÕES DE DADOS
-- ============================================

-- 3.1. Contar tarefas com position NULL ou 0
SELECT 
    'Tarefas com Position NULL ou 0' as verificação,
    COUNT(*) as quantidade,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.tasks) as percentual
FROM public.tasks 
WHERE position IS NULL OR position = 0;

-- 3.2. Verificar distribuição de positions por workspace
-- (Substitua 'workspace-id-aqui' pelo ID real do workspace)
SELECT 
    'Distribuição de Positions' as verificação,
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
LIMIT 10;

-- 3.3. Verificar se há posições duplicadas no mesmo workspace
-- (Substitua 'workspace-id-aqui' pelo ID real do workspace)
SELECT 
    'Posições Duplicadas' as verificação,
    workspace_id,
    position,
    COUNT(*) as quantidade_tarefas,
    array_agg(id::text) as task_ids
FROM public.tasks
WHERE workspace_id IS NOT NULL
    AND position IS NOT NULL
GROUP BY workspace_id, position
HAVING COUNT(*) > 1
ORDER BY quantidade_tarefas DESC;

-- ============================================
-- 4. VERIFICAÇÕES DE TRIGGERS
-- ============================================

-- 4.1. Listar todos os triggers na tabela tasks
SELECT 
    'Triggers na Tabela Tasks' as verificação,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'tasks'
ORDER BY trigger_name;

-- 4.2. Verificar função handle_updated_at
SELECT 
    'Função handle_updated_at' as verificação,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'handle_updated_at';

-- ============================================
-- 5. VERIFICAÇÕES DE PERMISSÕES
-- ============================================

-- 5.1. Verificar se o usuário atual está autenticado
SELECT 
    'Usuário Autenticado' as verificação,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN '✅ SIM - ' || auth.uid()::text
        ELSE '❌ NÃO'
    END as status;

-- 5.2. Verificar se o usuário atual é membro de algum workspace
-- (Substitua 'workspace-id-aqui' pelo ID real do workspace)
SELECT 
    'Membro do Workspace' as verificação,
    'workspace-id-aqui'::uuid as workspace_id,
    CASE 
        WHEN is_workspace_member('workspace-id-aqui'::uuid) THEN '✅ SIM'
        ELSE '❌ NÃO'
    END as status,
    (
        SELECT role 
        FROM public.workspace_members
        WHERE workspace_id = 'workspace-id-aqui'::uuid
            AND user_id = auth.uid()
    ) as role;

-- 5.3. Listar todos os workspaces do usuário atual
SELECT 
    'Workspaces do Usuário' as verificação,
    w.id,
    w.name,
    wm.role,
    is_workspace_member(w.id) as is_member_function
FROM public.workspaces w
INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid()
ORDER BY w.name;

-- ============================================
-- 6. TESTE DE UPDATE MANUAL
-- ============================================

-- 6.1. Testar UPDATE de position em uma tarefa específica
-- (Substitua 'task-id-aqui' e 'workspace-id-aqui' pelos valores reais)
-- DESCOMENTE E EXECUTE APENAS SE QUISER TESTAR:

/*
DO $$
DECLARE
    v_task_id UUID := 'task-id-aqui'::uuid;
    v_workspace_id UUID;
    v_old_position DOUBLE PRECISION;
    v_new_position DOUBLE PRECISION := 999.5;
    v_is_member BOOLEAN;
    v_update_result TEXT;
BEGIN
    -- Obter dados da tarefa
    SELECT workspace_id, position 
    INTO v_workspace_id, v_old_position
    FROM public.tasks
    WHERE id = v_task_id;
    
    IF v_old_position IS NULL THEN
        RAISE NOTICE '❌ Tarefa não encontrada: %', v_task_id;
        RETURN;
    END IF;
    
    RAISE NOTICE '📋 Tarefa encontrada:';
    RAISE NOTICE '   - ID: %', v_task_id;
    RAISE NOTICE '   - Workspace ID: %', v_workspace_id;
    RAISE NOTICE '   - Position atual: %', v_old_position;
    RAISE NOTICE '   - Usuário atual: %', auth.uid();
    
    -- Verificar se é membro do workspace
    IF v_workspace_id IS NOT NULL THEN
        SELECT is_workspace_member(v_workspace_id) INTO v_is_member;
        RAISE NOTICE '   - É membro do workspace: %', v_is_member;
        
        IF NOT v_is_member THEN
            RAISE NOTICE '❌ Usuário não é membro do workspace!';
            RETURN;
        END IF;
    END IF;
    
    -- Tentar fazer o UPDATE
    UPDATE public.tasks
    SET position = v_new_position
    WHERE id = v_task_id;
    
    -- Verificar resultado
    IF FOUND THEN
        RAISE NOTICE '✅ UPDATE realizado com sucesso!';
        RAISE NOTICE '   - Position antiga: %', v_old_position;
        RAISE NOTICE '   - Position nova: %', v_new_position;
        
        -- Restaurar position original
        UPDATE public.tasks
        SET position = v_old_position
        WHERE id = v_task_id;
        
        RAISE NOTICE '🔄 Position restaurada para o valor original';
    ELSE
        RAISE NOTICE '❌ UPDATE não afetou nenhuma linha (RLS bloqueou?)';
    END IF;
END $$;
*/

-- ============================================
-- 7. VERIFICAÇÕES DE FUNÇÕES AUXILIARES
-- ============================================

-- 7.1. Verificar se a função is_workspace_member existe
SELECT 
    'Função is_workspace_member' as verificação,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'is_workspace_member';

-- 7.2. Testar função is_workspace_member
-- (Substitua 'workspace-id-aqui' pelo ID real do workspace)
SELECT 
    'Teste is_workspace_member' as verificação,
    'workspace-id-aqui'::uuid as workspace_id,
    is_workspace_member('workspace-id-aqui'::uuid) as resultado;

-- ============================================
-- 8. RESUMO DE PROBLEMAS COMUNS
-- ============================================

-- 8.1. Verificar tarefas órfãs (sem workspace e sem created_by correto)
SELECT 
    'Tarefas Órfãs' as verificação,
    COUNT(*) as quantidade
FROM public.tasks
WHERE workspace_id IS NULL
    AND (is_personal = false OR created_by IS NULL);

-- 8.2. Verificar tarefas com workspace_id inválido
SELECT 
    'Tarefas com Workspace Inválido' as verificação,
    COUNT(*) as quantidade
FROM public.tasks t
WHERE t.workspace_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.workspaces w WHERE w.id = t.workspace_id
    );

-- 8.3. Verificar tarefas sem membros no workspace
SELECT 
    'Tarefas sem Membro no Workspace' as verificação,
    COUNT(*) as quantidade
FROM public.tasks t
WHERE t.workspace_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = t.workspace_id
    );

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Revise os resultados de cada seção
-- 3. Substitua 'workspace-id-aqui' e 'task-id-aqui' pelos valores reais
-- 4. Se encontrar problemas, consulte o documento DIAGNOSTICO_ORDEM_TAREFAS.md
-- 5. Para testar UPDATE manual, descomente a seção 6.1
--


