-- ============================================
-- MIGRATION: Restaurar assignee em recorrentes pessoais (WeeklyView)
--
-- Contexto:
-- - WeeklyView usa filtro assignee_id = usuário atual.
-- - Após correções retroativas, algumas tarefas recorrentes pessoais podem ter
--   permanecido com assignee_id NULL, deixando de aparecer no WeeklyView.
--
-- Objetivo:
-- - Para tarefas pessoais recorrentes (pai/filhas), garantir assignee_id = created_by
--   quando assignee_id estiver NULL.
-- ============================================

UPDATE public.tasks
SET
  assignee_id = created_by,
  updated_at = NOW()
WHERE workspace_id IS NULL
  AND is_personal = true
  AND (recurrence_type IS NOT NULL OR recurrence_parent_id IS NOT NULL)
  AND assignee_id IS NULL
  AND created_by IS NOT NULL;

-- ============================================
-- FIM DA MIGRATION
-- ============================================

