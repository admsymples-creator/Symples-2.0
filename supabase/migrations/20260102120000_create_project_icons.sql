-- ============================================
-- MIGRATION: Tabela project_icons
-- ============================================

-- Criar tabela project_icons
CREATE TABLE IF NOT EXISTS public.project_icons (
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    tag_name TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, tag_name)
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_project_icons_workspace_id ON public.project_icons(workspace_id);

-- Habilitar RLS
ALTER TABLE public.project_icons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Usuários podem ver ícones dos workspaces onde são membros
DROP POLICY IF EXISTS "Users can view project_icons of their workspaces" ON public.project_icons;
CREATE POLICY "Users can view project_icons of their workspaces"
    ON public.project_icons FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Usuários podem inserir ícones nos workspaces onde são membros
DROP POLICY IF EXISTS "Users can insert project_icons in their workspaces" ON public.project_icons;
CREATE POLICY "Users can insert project_icons in their workspaces"
    ON public.project_icons FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Usuários podem atualizar ícones nos workspaces onde são membros
DROP POLICY IF EXISTS "Users can update project_icons in their workspaces" ON public.project_icons;
CREATE POLICY "Users can update project_icons in their workspaces"
    ON public.project_icons FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Usuários podem deletar ícones nos workspaces onde são membros
DROP POLICY IF EXISTS "Users can delete project_icons in their workspaces" ON public.project_icons;
CREATE POLICY "Users can delete project_icons in their workspaces"
    ON public.project_icons FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

