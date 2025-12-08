-- ============================================
-- MIGRATION: Sistema de Mensagens do Assistente
-- ============================================

-- Criar tabela assistant_messages
CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL DEFAULT '',
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'component', 'image', 'audio', 'divider')),
    image_url TEXT,
    audio_url TEXT,
    audio_duration INTEGER, -- Duração em segundos
    audio_transcription TEXT,
    is_thinking BOOLEAN DEFAULT false,
    is_context_divider BOOLEAN DEFAULT false,
    component_data JSONB, -- Para dados de componentes generativos (ex: task_confirmation)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para performance em queries por workspace
CREATE INDEX IF NOT EXISTS idx_assistant_messages_workspace 
ON public.assistant_messages(workspace_id, created_at DESC);

-- Index para queries por usuário
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user 
ON public.assistant_messages(user_id, created_at DESC);

-- Index para queries combinadas (workspace + user)
CREATE INDEX IF NOT EXISTS idx_assistant_messages_workspace_user 
ON public.assistant_messages(workspace_id, user_id, created_at DESC);

-- Habilitar Realtime (opcional, para sincronização em tempo real)
ALTER TABLE public.assistant_messages REPLICA IDENTITY FULL;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver mensagens de seus workspaces ou mensagens pessoais (sem workspace)
DROP POLICY IF EXISTS "Users can view own workspace messages" ON public.assistant_messages;
CREATE POLICY "Users can view own workspace messages"
    ON public.assistant_messages FOR SELECT
    USING (
        -- Mensagens pessoais (sem workspace) - apenas o próprio usuário
        (workspace_id IS NULL AND user_id = auth.uid())
        OR
        -- Mensagens de workspace - usuário deve ser membro
        (workspace_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = assistant_messages.workspace_id
            AND user_id = auth.uid()
        ))
    );

-- Usuários podem criar mensagens em seus workspaces ou mensagens pessoais
DROP POLICY IF EXISTS "Users can create own messages" ON public.assistant_messages;
CREATE POLICY "Users can create own messages"
    ON public.assistant_messages FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            -- Mensagem pessoal (sem workspace)
            workspace_id IS NULL
            OR
            -- Mensagem de workspace - usuário deve ser membro
            EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = assistant_messages.workspace_id
                AND user_id = auth.uid()
            )
        )
    );

-- Usuários podem atualizar apenas suas próprias mensagens (útil para edição/remoção)
DROP POLICY IF EXISTS "Users can update own messages" ON public.assistant_messages;
CREATE POLICY "Users can update own messages"
    ON public.assistant_messages FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Usuários podem deletar apenas suas próprias mensagens
DROP POLICY IF EXISTS "Users can delete own messages" ON public.assistant_messages;
CREATE POLICY "Users can delete own messages"
    ON public.assistant_messages FOR DELETE
    USING (user_id = auth.uid());
