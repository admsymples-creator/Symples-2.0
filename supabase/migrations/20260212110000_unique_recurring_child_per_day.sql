-- Remove duplicatas de filhos recorrentes no mesmo dia (mantém o mais antigo)
DELETE FROM tasks
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY recurrence_parent_id, (due_date AT TIME ZONE 'UTC')::date
             ORDER BY created_at ASC
           ) AS rn
    FROM tasks
    WHERE recurrence_parent_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Previne novas duplicatas: um pai só pode ter um filho por dia
-- AT TIME ZONE 'UTC' torna a expressão IMMUTABLE (necessário para índices no Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS unique_recurring_child_per_day
  ON tasks (recurrence_parent_id, ((due_date AT TIME ZONE 'UTC')::date))
  WHERE recurrence_parent_id IS NOT NULL;
