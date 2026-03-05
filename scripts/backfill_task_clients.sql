-- Backfill de client_id em Tasks
-- Data: 2026-01-20
-- Objetivo: Popular a nova coluna tasks.client_id usando histórico de transações

-- 1. Backfill Alta Confiança: Usar transações vinculadas que já possuem cliente
-- Lógica: Se uma tarefa tem uma transação (ou mais) e essa transação tem cliente, usamos esse cliente.
-- Em caso de múltiplos clientes para mesma tarefa (raro), pegamos o da transação mais recente.

WITH task_clients AS (
    SELECT DISTINCT ON (related_task_id)
        related_task_id,
        client_id
    FROM 
        public.transactions
    WHERE 
        related_task_id IS NOT NULL 
        AND client_id IS NOT NULL
    ORDER BY 
        related_task_id, created_at DESC
)
UPDATE public.tasks t
SET client_id = tc.client_id
FROM task_clients tc
WHERE t.id = tc.related_task_id
AND t.client_id IS NULL; -- Apenas se ainda não tiver cliente

-- 2. Verificação
SELECT count(*) as tasks_updated FROM public.tasks WHERE client_id IS NOT NULL;
