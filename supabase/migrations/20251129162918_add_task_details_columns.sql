-- Adicionar colunas para Tags e Subtarefas
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]';

-- Atualizar constraint de tipo de comentário para suportar 'audio'
ALTER TABLE public.task_comments 
DROP CONSTRAINT IF EXISTS task_comments_type_check;

ALTER TABLE public.task_comments 
ADD CONSTRAINT task_comments_type_check 
CHECK (type IN ('comment', 'log', 'file', 'system', 'audio'));

-- Criar índices para performance nas novas colunas (opcional, mas recomendado para tags)
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING GIN (tags);

