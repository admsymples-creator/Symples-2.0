-- Adicionar coluna visible_on_board na tabela tasks
-- Tarefas criadas no planner/visão semanal ficam ocultas do quadro até "Enviar para quadro"
-- Data: 2026-01-30

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS visible_on_board boolean DEFAULT true;

UPDATE public.tasks SET visible_on_board = true WHERE visible_on_board IS NULL;

COMMENT ON COLUMN public.tasks.visible_on_board IS 'Se false, a tarefa não aparece no quadro de tarefas do workspace até o usuário usar "Enviar para quadro".';
