-- ============================================
-- SCRIPT: Forçar Refresh de TODAS as RPCs de Movimentação
-- ============================================
-- Execute este script para forçar o Supabase a atualizar
-- o cache do schema para AMBAS as funções RPC:
-- - move_task (atualização individual)
-- - move_tasks_bulk (atualização em lote)
-- ============================================

-- ============================================
-- PARTE 1: move_task
-- ============================================

-- 1.1. Verificar função move_task
SELECT 
    'Verificação - move_task' as verificação,
    routine_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';

-- 1.2. Recriar move_task (remover versões com INTEGER e DOUBLE PRECISION)
DROP FUNCTION IF EXISTS public.move_task(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.move_task(UUID, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.move_task(
    p_task_id UUID,
    p_new_position DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
    v_current_user_id UUID;
    v_is_member BOOLEAN;
    v_old_position DOUBLE PRECISION;
    v_rows_affected INTEGER;
BEGIN
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    SELECT workspace_id, position INTO v_workspace_id, v_old_position
    FROM public.tasks
    WHERE id = p_task_id;
    
    IF v_workspace_id IS NULL AND v_old_position IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tarefa não encontrada',
            'task_id', p_task_id
        );
    END IF;
    
    IF v_workspace_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.workspace_members
            WHERE workspace_id = v_workspace_id
            AND user_id = v_current_user_id
        ) INTO v_is_member;
        
        IF NOT v_is_member THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.tasks
                WHERE id = p_task_id
                AND (
                    (workspace_id IS NULL AND is_personal = true AND created_by = v_current_user_id)
                    OR assignee_id = v_current_user_id
                )
            ) INTO v_is_member;
        END IF;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM public.tasks
            WHERE id = p_task_id
            AND (
                (is_personal = true AND created_by = v_current_user_id)
                OR assignee_id = v_current_user_id
            )
        ) INTO v_is_member;
    END IF;
    
    IF NOT v_is_member THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para mover esta tarefa',
            'task_id', p_task_id,
            'workspace_id', v_workspace_id,
            'user_id', v_current_user_id
        );
    END IF;
    
    UPDATE public.tasks
    SET position = p_new_position,
        updated_at = NOW()
    WHERE id = p_task_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nenhuma linha foi atualizada (possível problema de RLS)',
            'task_id', p_task_id,
            'rows_affected', v_rows_affected
        );
    END IF;
    
    SELECT position INTO v_old_position
    FROM public.tasks
    WHERE id = p_task_id;
    
    IF v_old_position IS NULL OR ABS(v_old_position - p_new_position) > 0.01 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Posição não foi atualizada corretamente',
            'task_id', p_task_id,
            'expected_position', p_new_position,
            'actual_position', v_old_position
        );
    END IF;
    
    RAISE NOTICE 'Tarefa % movida de % para %', p_task_id, v_old_position, p_new_position;
    
    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_task_id,
        'old_position', v_old_position,
        'new_position', p_new_position,
        'rows_affected', v_rows_affected
    );
    
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO anon;

-- ============================================
-- PARTE 2: move_tasks_bulk
-- ============================================

-- 2.1. Verificar função move_tasks_bulk
SELECT 
    'Verificação - move_tasks_bulk' as verificação,
    routine_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_tasks_bulk'
AND routine_type = 'FUNCTION';

-- 2.2. Recriar move_tasks_bulk
DROP FUNCTION IF EXISTS public.move_tasks_bulk(JSONB);

CREATE OR REPLACE FUNCTION public.move_tasks_bulk(
    p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_update JSONB;
    v_task_id UUID;
    v_new_position DOUBLE PRECISION;
    v_workspace_id UUID;
    v_current_user_id UUID;
    v_is_member BOOLEAN;
    v_updated_count INTEGER := 0;
BEGIN
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
        RAISE EXCEPTION 'Array de updates vazio ou inválido';
    END IF;
    
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_task_id := (v_update->>'id')::UUID;
        v_new_position := (v_update->>'position')::DOUBLE PRECISION;
        
        IF v_task_id IS NULL THEN
            RAISE WARNING 'ID de tarefa inválido no update: %', v_update;
            CONTINUE;
        END IF;
        
        IF v_new_position IS NULL THEN
            RAISE WARNING 'Position inválida no update: %', v_update;
            CONTINUE;
        END IF;
        
        SELECT workspace_id INTO v_workspace_id
        FROM public.tasks
        WHERE id = v_task_id;
        
        IF v_workspace_id IS NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.tasks
                WHERE id = v_task_id
                AND (workspace_id IS NULL AND is_personal = true AND created_by = v_current_user_id)
                OR assignee_id = v_current_user_id
            ) INTO v_is_member;
        ELSE
            SELECT EXISTS (
                SELECT 1
                FROM public.workspace_members
                WHERE workspace_id = v_workspace_id
                AND user_id = v_current_user_id
            ) INTO v_is_member;
            
            IF NOT v_is_member THEN
                SELECT EXISTS (
                    SELECT 1
                    FROM public.tasks
                    WHERE id = v_task_id
                    AND (workspace_id IS NULL AND is_personal = true AND created_by = v_current_user_id)
                    OR assignee_id = v_current_user_id
                ) INTO v_is_member;
            END IF;
        END IF;
        
        IF NOT v_is_member THEN
            RAISE WARNING 'Usuário não tem permissão para mover tarefa %', v_task_id;
            CONTINUE;
        END IF;
        
        UPDATE public.tasks
        SET position = v_new_position,
            updated_at = NOW()
        WHERE id = v_task_id;
        
        IF FOUND THEN
            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Bulk update concluído: % tarefas atualizadas de %', 
        v_updated_count, 
        jsonb_array_length(p_updates);
    
    IF v_updated_count = 0 THEN
        RAISE EXCEPTION 'Nenhuma tarefa foi atualizada. Verifique permissões e IDs.';
    END IF;
    
END;
$$;

COMMENT ON FUNCTION public.move_tasks_bulk(JSONB) IS 
'Atualiza múltiplas posições de tarefas em lote usando SECURITY DEFINER para contornar RLS. Recebe um array JSONB com objetos {id: UUID, position: DOUBLE PRECISION}. Verifica permissões para cada tarefa antes de atualizar.';

GRANT EXECUTE ON FUNCTION public.move_tasks_bulk(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_tasks_bulk(JSONB) TO anon;

-- ============================================
-- PARTE 3: Verificação Final
-- ============================================

-- 3.1. Verificar ambas as funções
SELECT 
    'Resultado Final' as verificação,
    routine_name,
    CASE 
        WHEN routine_name = 'move_task' THEN '✅ Função move_task recriada'
        WHEN routine_name = 'move_tasks_bulk' THEN '✅ Função move_tasks_bulk recriada'
        ELSE '❌ Função desconhecida'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('move_task', 'move_tasks_bulk')
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 3.2. NOTA IMPORTANTE:
-- Após executar este script, aguarde 10-30 segundos para o PostgREST
-- atualizar o schema cache. Se os erros persistirem:
-- 1. Aguarde mais alguns segundos (até 60 segundos)
-- 2. Recarregue a página do aplicativo com hard refresh (Ctrl+F5)
-- 3. Verifique se está usando o projeto correto (PROD vs PREVIEW)
-- 4. Limpe o cache do navegador

