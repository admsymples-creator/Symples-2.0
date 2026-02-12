-- Fix: remover ocorrências recorrentes criadas indevidamente de forma retroativa
-- Critérios: são filhos de uma série (recurrence_parent_id NOT NULL),
-- têm due_date anterior a hoje, foram criadas hoje (pelo fix retroativo) e ainda estão pendentes.

DELETE FROM tasks
WHERE recurrence_parent_id IS NOT NULL
  AND status = 'todo'
  AND due_date < CURRENT_DATE
  AND created_at::date = CURRENT_DATE;
