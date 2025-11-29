-- ============================================
-- SYMPLES V2.0 - MASTER SCHEMA (PRODUÇÃO)
-- Versão: 2.1 (com Trial/Subscription + WhatsApp + Review Status)
-- ============================================

-- 1. CONFIGURAÇÃO INICIAL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. TABELAS DE BASE (AUTH & WORKSPACES)
-- ============================================

-- PROFILES (Perfis de Usuário)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT NOT NULL,
    whatsapp TEXT, -- Campo para integração WhatsApp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKSPACES (Empresas/Organizações)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- Mantido como NOT NULL para consistência
    magic_code TEXT UNIQUE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '15 days'),
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired', 'past_due')),
    subscription_id TEXT, -- ID da assinatura no gateway de pagamento (Stripe, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKSPACE_MEMBERS (Membros dos Workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- ============================================
-- 3. MOTOR DE TAREFAS (CORE)
-- ============================================

-- TASKS (Tarefas)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'archived')),
    priority TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    position DOUBLE PRECISION DEFAULT 0,
    due_date TIMESTAMPTZ,
    is_personal BOOLEAN DEFAULT false NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    origin_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASK_ATTACHMENTS (Anexos de Tarefas)
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASK_COMMENTS (Comentários e Logs de Tarefas)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'comment' NOT NULL CHECK (type IN ('comment', 'log', 'file', 'system')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. FINANCEIRO (Transações)
-- ============================================

-- TRANSACTIONS (Transações Financeiras)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT DEFAULT 'Geral',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'scheduled', 'cancelled')),
    due_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. GESTÃO DE TIME
-- ============================================

-- WORKSPACE_INVITES (Convites para Workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);

-- ============================================
-- 6. AUDITORIA
-- ============================================

-- AUDIT_LOGS (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. ÍNDICES (Performance)
-- ============================================

-- Índices para tasks
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_is_personal ON public.tasks(is_personal, created_by) WHERE is_personal = true;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status) WHERE status IS NOT NULL;

-- Índices para workspaces (novos)
CREATE INDEX IF NOT EXISTS idx_workspaces_trial_ends_at ON public.workspaces(trial_ends_at) WHERE subscription_status = 'trial';
CREATE INDEX IF NOT EXISTS idx_workspaces_subscription_status ON public.workspaces(subscription_status);

-- Índices para workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_id ON public.transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON public.transactions(due_date);

-- Índices para outras tabelas
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON public.workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON public.audit_logs(workspace_id);

-- ============================================
-- 8. TRIGGERS (Automação)
-- ============================================

-- Function: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_workspaces ON public.workspaces;
CREATE TRIGGER set_updated_at_workspaces
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_workspace_members ON public.workspace_members;
CREATE TRIGGER set_updated_at_workspace_members
    BEFORE UPDATE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_tasks ON public.tasks;
CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_transactions ON public.transactions;
CREATE TRIGGER set_updated_at_transactions
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_workspace_invites ON public.workspace_invites;
CREATE TRIGGER set_updated_at_workspace_invites
    BEFORE UPDATE ON public.workspace_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function: Criar profile automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, whatsapp)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'whatsapp'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Disparar criação de profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function: Adicionar owner como membro do workspace automaticamente
CREATE OR REPLACE FUNCTION public.handle_workspace_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Adicionar owner automaticamente como membro
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_workspace_owner_membership();

-- ============================================
-- 9. FUNÇÕES AUXILIARES
-- ============================================

-- Function: Verificar se usuário é membro de um workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = workspace_uuid
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verificar se usuário é owner/admin de um workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = workspace_uuid
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verificar se trial está ativo
CREATE OR REPLACE FUNCTION public.is_trial_active(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.workspaces
        WHERE id = workspace_uuid
        AND subscription_status = 'trial'
        AND trial_ends_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verificar se workspace tem subscription ativa
CREATE OR REPLACE FUNCTION public.has_active_subscription(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.workspaces
        WHERE id = workspace_uuid
        AND (
            subscription_status = 'active'
            OR (subscription_status = 'trial' AND trial_ends_at > NOW())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS) - Habilitação
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. RLS POLICIES - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view workspace members profiles" ON public.profiles;
CREATE POLICY "Users can view workspace members profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.workspace_members wm1
            INNER JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid()
            AND wm2.user_id = profiles.id
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- 12. RLS POLICIES - WORKSPACES
-- ============================================

DROP POLICY IF EXISTS "Users can view workspace if member" ON public.workspaces;
CREATE POLICY "Users can view workspace if member"
    ON public.workspaces FOR SELECT
    USING (
        (owner_id = auth.uid() OR is_workspace_member(id))
        AND has_active_subscription(id) -- Verificar subscription ativa
    );

DROP POLICY IF EXISTS "Owners can update workspace" ON public.workspaces;
CREATE POLICY "Owners can update workspace"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create workspace" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspace"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete workspace" ON public.workspaces;
CREATE POLICY "Owners can delete workspace"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================
-- 13. RLS POLICIES - WORKSPACE_MEMBERS
-- ============================================

DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
    ON public.workspace_members FOR SELECT
    USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Admins can add workspace members" ON public.workspace_members;
CREATE POLICY "Admins can add workspace members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Admins can update workspace member roles" ON public.workspace_members;
CREATE POLICY "Admins can update workspace member roles"
    ON public.workspace_members FOR UPDATE
    USING (is_workspace_admin(workspace_id))
    WITH CHECK (is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Admins can remove workspace members" ON public.workspace_members;
CREATE POLICY "Admins can remove workspace members"
    ON public.workspace_members FOR DELETE
    USING (
        is_workspace_admin(workspace_id)
        AND (
            SELECT role FROM public.workspace_members
            WHERE workspace_id = workspace_members.workspace_id
            AND user_id = workspace_members.user_id
        ) != 'owner'
    );

-- ============================================
-- 14. RLS POLICIES - TASKS
-- ============================================

DROP POLICY IF EXISTS "Users can view workspace tasks" ON public.tasks;
CREATE POLICY "Users can view workspace tasks"
    ON public.tasks FOR SELECT
    USING (
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
        OR
        (assignee_id = auth.uid())
    );

DROP POLICY IF EXISTS "Workspace members can create tasks" ON public.tasks;
CREATE POLICY "Workspace members can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
    );

DROP POLICY IF EXISTS "Members can update workspace tasks" ON public.tasks;
CREATE POLICY "Members can update workspace tasks"
    ON public.tasks FOR UPDATE
    USING (
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
        OR
        assignee_id = auth.uid()
    )
    WITH CHECK (
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
    );

DROP POLICY IF EXISTS "Creators or admins can delete tasks" ON public.tasks;
CREATE POLICY "Creators or admins can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        created_by = auth.uid()
        OR
        (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
    );

-- ============================================
-- 15. RLS POLICIES - TASK_ATTACHMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view task attachments if can view task" ON public.task_attachments;
CREATE POLICY "Users can view task attachments if can view task"
    ON public.task_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND (
                (tasks.workspace_id IS NOT NULL AND is_workspace_member(tasks.workspace_id))
                OR
                (tasks.workspace_id IS NULL AND tasks.is_personal = true AND tasks.created_by = auth.uid())
                OR
                tasks.assignee_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Members can attach files to tasks" ON public.task_attachments;
CREATE POLICY "Members can attach files to tasks"
    ON public.task_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND (
                (tasks.workspace_id IS NOT NULL AND is_workspace_member(tasks.workspace_id))
                OR
                (tasks.workspace_id IS NULL AND tasks.is_personal = true AND tasks.created_by = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Uploader or admins can delete attachments" ON public.task_attachments;
CREATE POLICY "Uploader or admins can delete attachments"
    ON public.task_attachments FOR DELETE
    USING (
        uploader_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND tasks.workspace_id IS NOT NULL
            AND is_workspace_admin(tasks.workspace_id)
        )
    );

-- ============================================
-- 16. RLS POLICIES - TASK_COMMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view comments if can view task" ON public.task_comments;
CREATE POLICY "Users can view comments if can view task"
    ON public.task_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND (
                (tasks.workspace_id IS NOT NULL AND is_workspace_member(tasks.workspace_id))
                OR
                (tasks.workspace_id IS NULL AND tasks.is_personal = true AND tasks.created_by = auth.uid())
                OR
                tasks.assignee_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Members can comment on tasks" ON public.task_comments;
CREATE POLICY "Members can comment on tasks"
    ON public.task_comments FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_comments.task_id
            AND (
                (tasks.workspace_id IS NOT NULL AND is_workspace_member(tasks.workspace_id))
                OR
                (tasks.workspace_id IS NULL AND tasks.is_personal = true AND tasks.created_by = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage own comments" ON public.task_comments;
CREATE POLICY "Users can manage own comments"
    ON public.task_comments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comments" ON public.task_comments;
CREATE POLICY "Users can delete own comments"
    ON public.task_comments FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 17. RLS POLICIES - TRANSACTIONS
-- ============================================

DROP POLICY IF EXISTS "Workspace members can view transactions" ON public.transactions;
CREATE POLICY "Workspace members can view transactions"
    ON public.transactions FOR SELECT
    USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can create transactions" ON public.transactions;
CREATE POLICY "Members can create transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (
        is_workspace_member(workspace_id)
        AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = transactions.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

DROP POLICY IF EXISTS "Members can update transactions" ON public.transactions;
CREATE POLICY "Members can update transactions"
    ON public.transactions FOR UPDATE
    USING (
        is_workspace_member(workspace_id)
        AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = transactions.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

DROP POLICY IF EXISTS "Admins or creators can delete transactions" ON public.transactions;
CREATE POLICY "Admins or creators can delete transactions"
    ON public.transactions FOR DELETE
    USING (
        is_workspace_admin(workspace_id)
        OR
        created_by = auth.uid()
    );

-- ============================================
-- 18. RLS POLICIES - WORKSPACE_INVITES
-- ============================================

DROP POLICY IF EXISTS "Admins can view workspace invites" ON public.workspace_invites;
CREATE POLICY "Admins can view workspace invites"
    ON public.workspace_invites FOR SELECT
    USING (is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Users can view invites for own email" ON public.workspace_invites;
CREATE POLICY "Users can view invites for own email"
    ON public.workspace_invites FOR SELECT
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can create workspace invites" ON public.workspace_invites;
CREATE POLICY "Admins can create workspace invites"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Admins can update workspace invites" ON public.workspace_invites;
CREATE POLICY "Admins can update workspace invites"
    ON public.workspace_invites FOR UPDATE
    USING (is_workspace_admin(workspace_id))
    WITH CHECK (is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Admins can delete workspace invites" ON public.workspace_invites;
CREATE POLICY "Admins can delete workspace invites"
    ON public.workspace_invites FOR DELETE
    USING (is_workspace_admin(workspace_id));

-- ============================================
-- 19. RLS POLICIES - AUDIT_LOGS
-- ============================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        workspace_id IS NULL
        OR is_workspace_admin(workspace_id)
    );

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- FIM DO SCHEMA
-- ============================================

