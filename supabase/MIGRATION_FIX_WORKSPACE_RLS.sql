-- ============================================
-- MIGRATION: Corrigir RLS Policies para Criação de Workspace
-- Execute este script em PROD para corrigir o erro de permissão ao criar workspace
-- ============================================

-- ============================================
-- 1. CORRIGIR POLICY DE SELECT - WORKSPACES
-- ============================================
-- Problema: A policy verifica has_active_subscription() mesmo para owners,
-- bloqueando a visualização de workspaces recém-criados

DROP POLICY IF EXISTS "Users can view workspace if member" ON public.workspaces;

CREATE POLICY "Users can view workspace if member"
    ON public.workspaces FOR SELECT
    USING (
        -- Owner sempre pode ver seu workspace, mesmo sem subscription ativa
        (owner_id = auth.uid())
        OR
        -- Membros precisam ter subscription ativa
        (is_workspace_member(id) AND has_active_subscription(id))
    );

-- ============================================
-- 2. CORRIGIR POLICY DE INSERT - WORKSPACE_MEMBERS
-- ============================================
-- Problema: A policy exige ser admin, mas durante a criação o owner ainda não é membro/admin

DROP POLICY IF EXISTS "Admins can add workspace members" ON public.workspace_members;

CREATE POLICY "Admins can add workspace members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        -- Owner pode se adicionar como membro durante criação do workspace
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE workspaces.id = workspace_members.workspace_id
            AND workspaces.owner_id = auth.uid()
            AND workspace_members.user_id = auth.uid()
        )
        OR
        -- Admin pode adicionar outros membros
        is_workspace_admin(workspace_id)
    );

-- ============================================
-- MIGRATION CONCLUÍDA
-- ============================================

SELECT '✅ RLS Policies corrigidas! Agora é possível criar workspaces.' as resultado;






