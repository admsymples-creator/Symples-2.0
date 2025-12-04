-- MIGRATION: Adicionar logo_url em workspaces
-- Data: 29/11/2025

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN logo_url TEXT;
        RAISE NOTICE '✅ Campo logo_url adicionado em workspaces';
    ELSE
        RAISE NOTICE '⚠️ Campo logo_url já existe em workspaces';
    END IF;
END $$;






