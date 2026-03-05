-- ============================================
-- MIGRATION: Reverter tarefas pessoais promovidas por engano ao quadro
-- Contexto:
-- - Algumas tarefas criadas em weekly_view/planner foram promovidas para o
--   inbox do workspace por regra automática de assignee.
-- - Isso lotou o backlog/inbox com tarefas que deveriam continuar pessoais.
--
-- Estratégia segura (retroativa):
-- - Alvo apenas tarefas com forte sinal de origem pessoal:
--   1) origin_context = planner/weekly_view
--   2) hoje estão em workspace (workspace_id IS NOT NULL)
--   3) marcadas como não pessoais (is_personal = false)
--   4) visíveis no quadro (visible_on_board = true)
--   5) no inbox (group_id IS NULL)
--   6) atribuídas ao próprio criador (assignee_id = created_by)
--
-- Resultado:
-- - Voltam para contexto pessoal:
--   workspace_id = NULL, is_personal = true, visible_on_board = false
-- ============================================

WITH candidate_tasks AS (
  SELECT id
  FROM public.tasks
  WHERE workspace_id IS NOT NULL
    AND is_personal = false
    AND visible_on_board = true
    AND group_id IS NULL
    AND assignee_id IS NOT NULL
    AND assignee_id = created_by
    AND COALESCE(origin_context::text, '') IN (
      'planner',
      'weekly_view',
      '"planner"',
      '"weekly_view"'
    )
)
UPDATE public.tasks t
SET
  workspace_id = NULL,
  is_personal = true,
  visible_on_board = false,
  group_id = NULL,
  updated_at = NOW()
WHERE t.id IN (SELECT id FROM candidate_tasks);

-- ============================================
-- FIM DA MIGRATION
-- ============================================

