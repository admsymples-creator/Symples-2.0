-- ============================================
-- MIGRATION: Criar função RPC move_task
-- ============================================
-- Esta função permite atualizar a posição de uma tarefa
-- contornando problemas de RLS usando SECURITY DEFINER
-- 
-- Data: 2025-01-01
-- ============================================

-- Remover função existente se houver (com todos os tipos possíveis)
DROP FUNCTION IF EXISTS public.move_task(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.move_task(UUID, DOUBLE PRECISION);

-- Criar função move_task
-- Esta função usa SECURITY DEFINER para executar com privilégios elevados
-- e contornar políticas RLS que podem estar bloqueando updates de position
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

-- Comentário na função
COMMENT ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) IS 
'Atualiza a posição de uma tarefa usando SECURITY DEFINER para contornar RLS. Retorna JSONB com informações de sucesso/erro. Verifica se o usuário tem permissão antes de atualizar.';

-- Garantir que a função está acessível
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO anon;

