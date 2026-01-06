-- ============================================
-- MIGRATION: Adicionar Campos de Recorrência e Subtarefas
-- ============================================

DO $$
BEGIN
    -- 1. recurrence_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'recurrence_type'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN recurrence_type TEXT;
        -- Adicionar constraint
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_recurrence_type_check 
        CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom'));
        
        RAISE NOTICE 'Campo recurrence_type adicionado';
    ELSE
        RAISE NOTICE 'Campo recurrence_type já existe';
    END IF;

    -- 2. recurrence_interval
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'recurrence_interval'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN recurrence_interval INTEGER DEFAULT 1;
        RAISE NOTICE 'Campo recurrence_interval adicionado';
    ELSE
        RAISE NOTICE 'Campo recurrence_interval já existe';
    END IF;

    -- 3. recurrence_end_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'recurrence_end_date'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN recurrence_end_date TIMESTAMPTZ;
        RAISE NOTICE 'Campo recurrence_end_date adicionado';
    ELSE
        RAISE NOTICE 'Campo recurrence_end_date já existe';
    END IF;

    -- 4. recurrence_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'recurrence_count'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN recurrence_count INTEGER;
        RAISE NOTICE 'Campo recurrence_count adicionado';
    ELSE
        RAISE NOTICE 'Campo recurrence_count já existe';
    END IF;

    -- 5. subtasks
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'subtasks'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Campo subtasks adicionado';
    ELSE
        RAISE NOTICE 'Campo subtasks já existe';
    END IF;

    -- 6. tags (caso não exista, pois vi referências no código)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Campo tags adicionado';
    ELSE
        RAISE NOTICE 'Campo tags já existe';
    END IF;

END $$;

SELECT 'Migration de Recorrência concluída com sucesso! ✅' as resultado;
