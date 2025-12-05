-- ============================================
-- MIGRATION: Fix due_date e Triggers
-- ============================================
-- Execute este script ANTES de executar o schema.sql completo
-- Resolve problemas de coluna due_date faltando e triggers duplicados

-- 1. Adicionar coluna due_date se não existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tasks' 
            AND column_name = 'due_date'
        ) THEN
            ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMPTZ;
            RAISE NOTICE 'Coluna due_date adicionada à tabela tasks';
        ELSE
            RAISE NOTICE 'Coluna due_date já existe na tabela tasks';
        END IF;
    END IF;
END $$;

-- 2. Remover triggers existentes para evitar conflitos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_workspaces ON public.workspaces;
DROP TRIGGER IF EXISTS set_updated_at_workspace_members ON public.workspace_members;
DROP TRIGGER IF EXISTS set_updated_at_tasks ON public.tasks;
DROP TRIGGER IF EXISTS set_updated_at_transactions ON public.transactions;
DROP TRIGGER IF EXISTS set_updated_at_workspace_invites ON public.workspace_invites;

-- 3. Criar índice para due_date se a coluna existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'due_date'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
        RAISE NOTICE 'Índice idx_tasks_due_date criado';
    END IF;
END $$;

