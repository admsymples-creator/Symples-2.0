-- ============================================
-- SCRIPT: Criar/Verificar função move_task
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- para garantir que a função RPC move_task existe
-- ============================================

-- 1. Verificar se a função existe
SELECT 
    'Verificação - move_task' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'move_task'
            AND routine_type = 'FUNCTION'
        ) THEN '✅ Função move_task existe'
        ELSE '❌ Função move_task NÃO existe - será criada abaixo'
    END as status;

-- 2. Remover função existente se houver (com todas as assinaturas possíveis)
DROP FUNCTION IF EXISTS public.move_task(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.move_task(UUID, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.move_task(DOUBLE PRECISION, UUID);
-- Nota: A função agora retorna JSONB em vez de VOID para permitir verificação de sucesso

-- 3. Criar função move_task (versão melhorada que retorna JSONB)
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
    
    -- Usar RETURNING para pegar a posição atualizada diretamente do UPDATE
    -- Isso evita problemas com RLS no SELECT subsequente
    UPDATE public.tasks
    SET position = p_new_position,
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING position INTO v_old_position;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nenhuma linha foi atualizada (possível problema de RLS)',
            'task_id', p_task_id,
            'rows_affected', v_rows_affected
        );
    END IF;
    
    -- v_old_position agora contém a posição que foi realmente salva no UPDATE
    IF v_old_position IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Posição retornada pelo UPDATE é NULL',
            'task_id', p_task_id,
            'expected_position', p_new_position,
            'actual_position', v_old_position
        );
    END IF;
    
    -- Verificar se a posição salva corresponde à esperada (com tolerância de 0.01)
    IF ABS(v_old_position - p_new_position) > 0.01 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Posição não foi atualizada corretamente',
            'task_id', p_task_id,
            'expected_position', p_new_position,
            'actual_position', v_old_position,
            'difference', ABS(v_old_position - p_new_position)
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

-- 4. Comentário na função
COMMENT ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) IS 
'Atualiza a posição de uma tarefa usando SECURITY DEFINER para contornar RLS. Retorna JSONB com informações de sucesso/erro. Verifica se o usuário tem permissão antes de atualizar e confirma que a atualização foi realizada.';

-- 5. Garantir que a função está acessível
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO anon;

-- 6. Verificar se foi criada com sucesso
SELECT 
    'Resultado Final' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'move_task'
            AND routine_type = 'FUNCTION'
        ) THEN '✅ Função move_task criada com sucesso!'
        ELSE '❌ Erro ao criar função move_task'
    END as status;

-- 7. Mostrar detalhes da função criada
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';

