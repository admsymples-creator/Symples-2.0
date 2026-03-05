-- ============================================
-- SCRIPT: Forçar Refresh do Schema Cache
-- ============================================
-- Execute este script para forçar o Supabase a atualizar
-- o cache do schema após criar/modificar funções RPC
-- ============================================

-- 1. Verificar função move_task
SELECT 
    'Verificação - move_task' as verificação,
    routine_name,
    routine_type,
    data_type as return_type,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';

-- 2. Recriar a função para forçar refresh do cache
-- (Isso força o PostgREST a atualizar o cache)
-- Remove versões com INTEGER e DOUBLE PRECISION
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
    -- Obter usuário atual
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Obter workspace_id e posição atual da tarefa
    SELECT workspace_id, position INTO v_workspace_id, v_old_position
    FROM public.tasks
    WHERE id = p_task_id;
    
    IF v_workspace_id IS NULL AND v_old_position IS NULL THEN
        -- Tarefa não existe
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tarefa não encontrada',
            'task_id', p_task_id
        );
    END IF;
    
    -- Verificar se o usuário é membro do workspace
    IF v_workspace_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.workspace_members
            WHERE workspace_id = v_workspace_id
            AND user_id = v_current_user_id
        ) INTO v_is_member;
        
        -- Se não for membro, verificar se é tarefa pessoal ou assignee
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
        -- Tarefa sem workspace - verificar se é pessoal ou assignee
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
    
    -- Atualizar a posição
    UPDATE public.tasks
    SET position = p_new_position,
        updated_at = NOW()
    WHERE id = p_task_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    -- Verificar se a atualização foi bem-sucedida
    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nenhuma linha foi atualizada (possível problema de RLS)',
            'task_id', p_task_id,
            'rows_affected', v_rows_affected
        );
    END IF;
    
    -- Verificar se a posição foi realmente atualizada
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
    
    -- Log opcional
    RAISE NOTICE 'Tarefa % movida de % para %', p_task_id, v_old_position, p_new_position;
    
    -- Retornar sucesso com informações
    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_task_id,
        'old_position', v_old_position,
        'new_position', p_new_position,
        'rows_affected', v_rows_affected
    );
    
END;
$$;

-- 3. Garantir permissões
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO anon;

-- 4. Verificar novamente
SELECT 
    'Resultado Final' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'move_task'
            AND routine_type = 'FUNCTION'
        ) THEN '✅ Função move_task recriada e cache deve ser atualizado'
        ELSE '❌ Erro ao recriar função'
    END as status;

-- 5. NOTA IMPORTANTE:
-- Após executar este script, aguarde 10-30 segundos para o PostgREST
-- atualizar o schema cache. Se o erro persistir:
-- 1. Aguarde mais alguns segundos
-- 2. Recarregue a página do aplicativo
-- 3. Verifique se está usando o projeto correto (PROD vs PREVIEW)

