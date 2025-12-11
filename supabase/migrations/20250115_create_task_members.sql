-- ============================================
-- MIGRATION: Criar tabela task_members
-- ============================================
-- Esta migration cria a tabela task_members para suportar múltiplos membros por tarefa
-- Mantém assignee_id como responsável principal para compatibilidade

-- ============================================
-- 1. CRIAR TABELA task_members
-- ============================================
CREATE TABLE IF NOT EXISTS public.task_members (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (task_id, user_id)
);

-- ============================================
-- 2. CRIAR ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_task_members_task_id ON public.task_members(task_id);
CREATE INDEX IF NOT EXISTS idx_task_members_user_id ON public.task_members(user_id);

-- ============================================
-- 3. MIGRAR DADOS EXISTENTES
-- ============================================
-- Copiar todos os assignee_id existentes para task_members
-- Ignora duplicatas caso já existam
INSERT INTO public.task_members (task_id, user_id, created_at)
SELECT id, assignee_id, NOW()
FROM public.tasks
WHERE assignee_id IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

-- ============================================
-- 4. RLS POLICIES
-- ============================================
-- Habilitar RLS
ALTER TABLE public.task_members ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver membros de tarefas que têm acesso
CREATE POLICY "Users can view task members of accessible tasks"
ON public.task_members
FOR SELECT
USING (
    -- Tarefa pessoal criada pelo usuário ou atribuída a ele
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_members.task_id
        AND (
            (t.is_personal = true AND t.created_by = auth.uid())
            OR t.assignee_id = auth.uid()
            OR t.created_by = auth.uid()
        )
    )
    OR
    -- Tarefa de workspace onde o usuário é membro
    EXISTS (
        SELECT 1 FROM public.tasks t
        INNER JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id
        WHERE t.id = task_members.task_id
        AND wm.user_id = auth.uid()
    )
);

-- Policy: Usuários podem adicionar membros a tarefas que podem editar
CREATE POLICY "Users can add members to editable tasks"
ON public.task_members
FOR INSERT
WITH CHECK (
    -- Tarefa pessoal criada pelo usuário
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_members.task_id
        AND t.is_personal = true
        AND t.created_by = auth.uid()
    )
    OR
    -- Tarefa de workspace onde o usuário é membro (não viewer)
    EXISTS (
        SELECT 1 FROM public.tasks t
        INNER JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id
        WHERE t.id = task_members.task_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Usuários podem remover membros de tarefas que podem editar
CREATE POLICY "Users can remove members from editable tasks"
ON public.task_members
FOR DELETE
USING (
    -- Tarefa pessoal criada pelo usuário
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_members.task_id
        AND t.is_personal = true
        AND t.created_by = auth.uid()
    )
    OR
    -- Tarefa de workspace onde o usuário é membro (não viewer)
    EXISTS (
        SELECT 1 FROM public.tasks t
        INNER JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id
        WHERE t.id = task_members.task_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
    OR
    -- O próprio usuário pode se remover
    task_members.user_id = auth.uid()
);

-- ============================================
-- 5. TRIGGER: Sincronizar assignee_id com task_members
-- ============================================
-- Quando assignee_id é atualizado, garantir que o membro também está em task_members
CREATE OR REPLACE FUNCTION public.sync_assignee_to_task_members()
RETURNS TRIGGER AS $$
BEGIN
    -- Se assignee_id foi definido e não está em task_members, adicionar
    IF NEW.assignee_id IS NOT NULL THEN
        INSERT INTO public.task_members (task_id, user_id, created_at)
        VALUES (NEW.id, NEW.assignee_id, NOW())
        ON CONFLICT (task_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronizar quando assignee_id é atualizado
DROP TRIGGER IF EXISTS sync_assignee_to_task_members_trigger ON public.tasks;
CREATE TRIGGER sync_assignee_to_task_members_trigger
    AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
    FOR EACH ROW
    WHEN (NEW.assignee_id IS NOT NULL)
    EXECUTE FUNCTION public.sync_assignee_to_task_members();

