-- ============================================
-- MIGRATION: Sistema de Notificações Unificado
-- ============================================

-- Criar tabela notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    triggering_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quem causou a ação (opcional)
    category TEXT NOT NULL DEFAULT 'operational' CHECK (category IN ('operational', 'admin', 'system')),
    resource_type TEXT NOT NULL, -- Ex: 'task', 'member', 'billing', 'attachment'
    resource_id UUID, -- ID do recurso relacionado
    title TEXT NOT NULL,
    content TEXT,
    action_url TEXT, -- Link para onde o clique leva (ex: /tasks?id=123)
    metadata JSONB DEFAULT '{}'::jsonb, -- Para icones, cores e dados extras
    read_at TIMESTAMPTZ, -- Null = Não lido
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para performance em queries de "não lidas" no Popover
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
ON public.notifications(recipient_id) 
WHERE read_at IS NULL;

-- Index para ordenação por data
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON public.notifications(recipient_id, created_at DESC);

-- Index para filtros por categoria
CREATE INDEX IF NOT EXISTS idx_notifications_category 
ON public.notifications(recipient_id, category) 
WHERE read_at IS NULL;

-- Habilitar Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias notificações
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = recipient_id);

-- Usuários podem atualizar suas próprias notificações (marcar como lida)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Sistema pode criar notificações (via server actions com service role)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

