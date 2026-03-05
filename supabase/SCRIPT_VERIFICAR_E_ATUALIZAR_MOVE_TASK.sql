-- ============================================
-- SCRIPT: Verificar e Atualizar move_task
-- ============================================
-- Este script verifica se a função move_task está usando
-- a versão antiga (VOID) ou a nova (JSONB) e atualiza se necessário
-- ============================================

-- 1. Verificar tipo de retorno atual
SELECT 
    'Verificação - Tipo de Retorno' as verificação,
    routine_name,
    data_type as return_type,
    CASE 
        WHEN data_type = 'jsonb' THEN '✅ Versão NOVA (retorna JSONB)'
        WHEN data_type = 'void' THEN '⚠️ Versão ANTIGA (retorna VOID) - Precisa atualizar!'
        ELSE '❓ Tipo desconhecido: ' || data_type
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';

-- 2. Remover função existente (se houver com qualquer tipo)
-- Remove tanto a versão com INTEGER quanto com DOUBLE PRECISION
DROP FUNCTION IF EXISTS public.move_task(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.move_task(UUID, DOUBLE PRECISION);

-- 3. Criar nova versão que retorna JSONB (sempre recriar para garantir versão correta)
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

-- 4. Garantir permissões
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO anon;

-- 3. Verificar novamente após atualização
SELECT 
    'Resultado Final' as verificação,
    routine_name,
    data_type as return_type,
    CASE 
        WHEN data_type = 'jsonb' THEN '✅ Versão NOVA (JSONB) - Pronta para uso!'
        ELSE '❌ Ainda precisa atualizar'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';

-- 4. NOTA IMPORTANTE:
-- Após executar este script, aguarde 10-30 segundos para o PostgREST
-- atualizar o schema cache. Os logs do servidor agora vão mostrar
-- informações detalhadas sobre se a atualização realmente ocorreu.

