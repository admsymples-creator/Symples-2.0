-- MIGRATION: Adicionar updated_at em workspaces
-- Data: 29/11/2025

-- 1. Adicionar coluna updated_at em workspaces se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Campo updated_at adicionado em workspaces';
    ELSE
        RAISE NOTICE '⚠️ Campo updated_at já existe em workspaces';
    END IF;
END $$;

-- 2. Trigger para atualizar updated_at automaticamente (Workspaces)
-- Reutiliza a function handle_updated_at criada anteriormente
DROP TRIGGER IF EXISTS set_updated_at_workspaces ON public.workspaces;
CREATE TRIGGER set_updated_at_workspaces
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Trigger para atualizar updated_at automaticamente (Workspace Members)
-- Verifica se existe updated_at em workspace_members também, por garantia
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspace_members' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.workspace_members ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

DROP TRIGGER IF EXISTS set_updated_at_workspace_members ON public.workspace_members;
CREATE TRIGGER set_updated_at_workspace_members
    BEFORE UPDATE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();













