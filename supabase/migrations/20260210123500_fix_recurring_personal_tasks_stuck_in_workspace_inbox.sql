-- ============================================
-- MIGRATION: Corrigir recorrentes pessoais presas no inbox do workspace
--
-- Contexto:
-- - Algumas tarefas pessoais recorrentes (pai/filhas) foram promovidas para
--   workspace/inbox por regra antiga de promoção.
-- - A migration anterior pode não ter atingido todos os casos por filtros
--   muito restritos.
--
-- Objetivo:
-- - Reverter APENAS séries recorrentes com sinais de promoção indevida:
--   * tarefa recorrente (recurrence_type ou recurrence_parent_id)
--   * hoje em workspace (workspace_id IS NOT NULL)
--   * inbox (group_id IS NULL)
--   * atribuída ao próprio criador ou sem responsável
--
-- Estratégia:
-- - Identificar a série pelo "series_id" = COALESCE(recurrence_parent_id, id)
-- - Reverter todas as tarefas da mesma série que estejam em workspace
-- ============================================

WITH suspicious_series AS (
  SELECT DISTINCT COALESCE(recurrence_parent_id, id) AS series_id
  FROM public.tasks
  WHERE workspace_id IS NOT NULL
    AND group_id IS NULL
    AND (recurrence_type IS NOT NULL OR recurrence_parent_id IS NOT NULL)
    AND (assignee_id = created_by OR assignee_id IS NULL)
),
target_rows AS (
  SELECT t.id
  FROM public.tasks t
  JOIN suspicious_series s
    ON COALESCE(t.recurrence_parent_id, t.id) = s.series_id
  WHERE t.workspace_id IS NOT NULL
)
UPDATE public.tasks t
SET
  workspace_id = NULL,
  is_personal = true,
  visible_on_board = false,
  group_id = NULL,
  updated_at = NOW()
WHERE t.id IN (SELECT id FROM target_rows);

-- ============================================
-- FIM DA MIGRATION
-- ============================================

