-- ============================================
-- MIGRATION: Relax workspace SELECT RLS
-- Objetivo:
-- - Permitir que QUALQUER membro de um workspace visualize o workspace,
--   mesmo com trial/assinatura expirados.
-- - Manter o controle de trial/assinatura apenas para operações de escrita
--   via camada de aplicação (checkWorkspaceAccess).
--
-- Impacto:
-- - Owners continuam vendo todos os seus workspaces (comportamento atual).
-- - Membros que hoje "perderam" o workspace por causa do has_active_subscription(id)
--   voltam a enxergar o workspace e suas tarefas (somente leitura no banco).
-- ============================================

DROP POLICY IF EXISTS "Users can view workspace if member" ON public.workspaces;

CREATE POLICY "Users can view workspace if member"
    ON public.workspaces FOR SELECT
    USING (
        -- Owner sempre pode ver seu workspace
        owner_id = auth.uid()
        OR
        -- Qualquer membro pode ver o workspace, independentemente do estado da assinatura/trial
        is_workspace_member(id)
    );

-- ============================================
-- FIM DA MIGRATION
-- ============================================

