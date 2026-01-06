-- ============================================
-- MIGRATION: Permitir Recorrência em Workspaces
-- ============================================
-- Esta migration remove a restrição que impedia tarefas de workspace de serem recorrentes.

-- 1. REMOVER TRIGGER QUE BLOQUEIA RECORRÊNCIA EM WORKSPACES
DROP TRIGGER IF EXISTS enforce_recurrence_personal_only_trigger ON public.tasks;

-- 2. REMOVER FUNÇÃO DO TRIGGER
DROP FUNCTION IF EXISTS public.enforce_recurrence_personal_only();

SELECT 'Trigger de restrição removido com sucesso! Tarefas recorrentes em workspaces liberadas. ✅' as resultado;
