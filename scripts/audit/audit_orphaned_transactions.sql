-- Auditoria de Transações Órfãs e Inconsistências
-- Data: 2026-01-20

-- 1. Transações com related_task_id mas sem client_id
-- (Potencialmente deveriam herdar o cliente da tarefa, se a tarefa tivesse cliente)
SELECT 
    t.id as transaction_id,
    t.description,
    t.amount,
    t.created_at,
    t.related_task_id,
    task.title as task_title
FROM 
    public.transactions t
LEFT JOIN
    public.tasks task ON t.related_task_id = task.id
WHERE 
    t.related_task_id IS NOT NULL 
    AND t.client_id IS NULL;

-- 2. Transações apontando para Tarefas que não existem mais
-- (Caso ON DELETE SET NULL não tenha funcionado ou tenha sido soft-delete)
SELECT 
    t.id as transaction_id,
    t.description,
    t.related_task_id
FROM 
    public.transactions t
LEFT JOIN
    public.tasks task ON t.related_task_id = task.id
WHERE 
    t.related_task_id IS NOT NULL 
    AND task.id IS NULL;

-- 3. Transações sem Client ID e sem Task ID (Totalmente órfãs de contexto de negócio, exceto counterparty)
SELECT 
    count(*) as total_orphans
FROM 
    public.transactions
WHERE 
    client_id IS NULL 
    AND related_task_id IS NULL;
