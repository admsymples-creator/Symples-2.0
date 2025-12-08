-- ============================================
-- SCRIPT: Forçar Refresh do Schema Cache - move_tasks_bulk
-- ============================================
-- Execute este script para forçar o Supabase a atualizar
-- o cache do schema após criar/modificar a função RPC move_tasks_bulk
-- ============================================

-- 1. Verificar função move_tasks_bulk
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

-- 2. Recriar a função para forçar refresh do cache
-- (Isso força o PostgREST a atualizar o cache)
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
    -- Obter usuário atual
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Validar entrada
    IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
        RAISE EXCEPTION 'Array de updates vazio ou inválido';
    END IF;
    
    -- Iterar sobre cada update
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        -- Extrair id e position do JSON
        v_task_id := (v_update->>'id')::UUID;
        v_new_position := (v_update->>'position')::DOUBLE PRECISION;
        
        -- Validar valores
        IF v_task_id IS NULL THEN
            RAISE WARNING 'ID de tarefa inválido no update: %', v_update;
            CONTINUE;
        END IF;
        
        IF v_new_position IS NULL THEN
            RAISE WARNING 'Position inválida no update: %', v_update;
            CONTINUE;
        END IF;
        
        -- Obter workspace_id da tarefa
        SELECT workspace_id INTO v_workspace_id
        FROM public.tasks
        WHERE id = v_task_id;
        
        IF v_workspace_id IS NULL THEN
            -- Tarefa não encontrada ou sem workspace_id
            -- Verificar se é tarefa pessoal
            SELECT EXISTS (
                SELECT 1
                FROM public.tasks
                WHERE id = v_task_id
                AND (workspace_id IS NULL AND is_personal = true AND created_by = v_current_user_id)
                OR assignee_id = v_current_user_id
            ) INTO v_is_member;
        ELSE
            -- Verificar se o usuário é membro do workspace
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
        
        -- Atualizar a posição
        UPDATE public.tasks
        SET position = v_new_position,
            updated_at = NOW()
        WHERE id = v_task_id;
        
        -- Contar atualizações bem-sucedidas
        IF FOUND THEN
            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;
    
    -- Log do resultado
    RAISE NOTICE 'Bulk update concluído: % tarefas atualizadas de %', 
        v_updated_count, 
        jsonb_array_length(p_updates);
    
    -- Se nenhuma tarefa foi atualizada, lançar exceção
    IF v_updated_count = 0 THEN
        RAISE EXCEPTION 'Nenhuma tarefa foi atualizada. Verifique permissões e IDs.';
    END IF;
    
END;
$$;

-- 3. Comentário na função
COMMENT ON FUNCTION public.move_tasks_bulk(JSONB) IS 
'Atualiza múltiplas posições de tarefas em lote usando SECURITY DEFINER para contornar RLS. Recebe um array JSONB com objetos {id: UUID, position: DOUBLE PRECISION}. Verifica permissões para cada tarefa antes de atualizar.';

-- 4. Garantir permissões
GRANT EXECUTE ON FUNCTION public.move_tasks_bulk(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_tasks_bulk(JSONB) TO anon;

-- 5. Verificar novamente
SELECT 
    'Resultado Final' as verificação,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'move_tasks_bulk'
            AND routine_type = 'FUNCTION'
        ) THEN '✅ Função move_tasks_bulk recriada e cache deve ser atualizado'
        ELSE '❌ Erro ao recriar função'
    END as status;

-- 6. NOTA IMPORTANTE:
-- Após executar este script, aguarde 10-30 segundos para o PostgREST
-- atualizar o schema cache. Se o erro persistir:
-- 1. Aguarde mais alguns segundos
-- 2. Recarregue a página do aplicativo
-- 3. Verifique se está usando o projeto correto (PROD vs PREVIEW)


