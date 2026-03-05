-- ============================================
-- MIGRATION: Adicionar campos de recorrência na tabela tasks
-- ============================================
-- Esta migration adiciona suporte a recorrência para tarefas pessoais
-- Recorrência apenas para tarefas pessoais (is_personal = true)

-- ============================================
-- 1. ADICIONAR CAMPOS DE RECORRÊNCIA
-- ============================================

-- Tipo de recorrência: 'daily', 'weekly', 'monthly', 'custom'
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom'));

-- Intervalo para recorrência customizada (ex: a cada X dias)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER;

-- Data de fim da recorrência
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;

-- Número máximo de ocorrências
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER;

-- ID da tarefa original da série (para agrupar tarefas recorrentes)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Próxima data de geração (para otimizar queries)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_next_date TIMESTAMPTZ;

-- ============================================
-- 2. CRIAR ÍNDICES
-- ============================================

-- Índice para queries de série (buscar tarefas filhas de uma tarefa pai)
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_parent_id 
ON public.tasks(recurrence_parent_id) 
WHERE recurrence_parent_id IS NOT NULL;

-- Índice para queries de recorrência ativa
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_type 
ON public.tasks(recurrence_type) 
WHERE recurrence_type IS NOT NULL;

-- Índice composto para buscar próximas tarefas recorrentes a gerar
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_next_date 
ON public.tasks(recurrence_next_date, recurrence_type) 
WHERE recurrence_next_date IS NOT NULL AND recurrence_type IS NOT NULL;

-- ============================================
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN public.tasks.recurrence_type IS 'Tipo de recorrência: daily, weekly, monthly, ou custom (a cada X dias)';
COMMENT ON COLUMN public.tasks.recurrence_interval IS 'Intervalo para recorrência customizada (ex: a cada 3 dias). Apenas usado quando recurrence_type = custom';
COMMENT ON COLUMN public.tasks.recurrence_end_date IS 'Data de fim da recorrência. NULL = sem data de fim';
COMMENT ON COLUMN public.tasks.recurrence_count IS 'Número máximo de ocorrências. NULL = sem limite';
COMMENT ON COLUMN public.tasks.recurrence_parent_id IS 'ID da tarefa original da série. NULL para tarefas não recorrentes ou a tarefa original';
COMMENT ON COLUMN public.tasks.recurrence_next_date IS 'Próxima data em que uma nova ocorrência deve ser gerada. NULL para tarefas não recorrentes ou quando recorrência terminou';

-- ============================================
-- 4. CONSTRAINT: Recorrência apenas para tarefas pessoais
-- ============================================
-- Nota: Não podemos usar CHECK constraint porque precisamos verificar is_personal
-- A validação será feita na aplicação. Alternativamente, podemos usar um trigger.

-- Trigger para garantir que apenas tarefas pessoais podem ter recorrência
CREATE OR REPLACE FUNCTION public.enforce_recurrence_personal_only()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tem recorrência configurada, deve ser tarefa pessoal
    IF NEW.recurrence_type IS NOT NULL AND (NEW.is_personal IS FALSE OR NEW.workspace_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Recorrência só é permitida para tarefas pessoais (is_personal = true e workspace_id IS NULL)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS enforce_recurrence_personal_only_trigger ON public.tasks;
CREATE TRIGGER enforce_recurrence_personal_only_trigger
    BEFORE INSERT OR UPDATE OF recurrence_type, is_personal, workspace_id ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_recurrence_personal_only();

