-- ============================================
-- MIGRATION: Criar tabela task_comments
-- ============================================
-- Esta migration cria a tabela task_comments se ela não existir
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela task_comments
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'comment' NOT NULL CHECK (type IN ('comment', 'log', 'file', 'system')),
    metadata JSONB, -- Para logs automáticos: { "action": "status_changed", "old_value": "...", "new_value": "..." }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at);

-- Habilitar RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Task Comments: Seguem as mesmas regras de visibilidade da tarefa
CREATE POLICY IF NOT EXISTS "Users can view comments if can view task"
    ON public.task_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND (
                (tasks.workspace_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.workspace_members
                    WHERE workspace_id = tasks.workspace_id
                    AND user_id = auth.uid()
                ))
                OR
                (tasks.workspace_id IS NULL AND tasks.is_personal = true AND tasks.created_by = auth.uid())
                OR
                tasks.assignee_id = auth.uid()
            )
        )
    );

-- Task Comments: Membros podem comentar
CREATE POLICY IF NOT EXISTS "Members can comment on tasks"
    ON public.task_comments FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND (
                (tasks.workspace_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.workspace_members
                    WHERE workspace_id = tasks.workspace_id
                    AND user_id = auth.uid()
                ))
                OR
                (tasks.workspace_id IS NULL AND tasks.is_personal = true AND tasks.created_by = auth.uid())
            )
        )
    );

-- Task Comments: Autor pode editar próprio comentário
CREATE POLICY IF NOT EXISTS "Users can update own comments"
    ON public.task_comments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Task Comments: Autor pode deletar próprio comentário
CREATE POLICY IF NOT EXISTS "Users can delete own comments"
    ON public.task_comments FOR DELETE
    USING (user_id = auth.uid());

