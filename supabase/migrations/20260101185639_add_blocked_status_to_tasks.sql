-- ============================================
-- MIGRATION: Adicionar status 'blocked' à tabela tasks
-- ============================================
-- Esta migration adiciona o status 'blocked' (Bloqueado) ao CHECK constraint
-- Mantém 'correction' para compatibilidade com dados existentes

-- ============================================
-- ADICIONAR 'blocked' AO CHECK CONSTRAINT
-- ============================================
DO $$
BEGIN
    -- Remover constraint antiga se existir
    ALTER TABLE public.tasks 
    DROP CONSTRAINT IF EXISTS tasks_status_check;

    -- Adicionar nova constraint com 'blocked' incluído
    -- Mantém 'correction' para compatibilidade
    ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('todo', 'in_progress', 'review', 'correction', 'blocked', 'done', 'archived'));
    
    RAISE NOTICE '✅ Constraint tasks.status atualizada (adicionado blocked)';
END $$;

