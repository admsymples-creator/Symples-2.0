-- Migration: Adicionar coluna position à tabela tasks
-- Data: 2024

-- Adicionar coluna position se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'position'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN position DOUBLE PRECISION DEFAULT 0;
        
        -- Criar índice para melhor performance em ordenação
        CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(position) WHERE position IS NOT NULL;
        
        -- Atualizar posições existentes baseado em created_at
        UPDATE public.tasks 
        SET position = EXTRACT(EPOCH FROM created_at) 
        WHERE position = 0 OR position IS NULL;
    END IF;
END $$;

