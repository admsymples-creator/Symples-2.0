-- ============================================
-- SYMPLES - SCHEMA SQL COMPLETO (Supabase)
-- Versão: 2.0 (Full Scope)
-- ============================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. NÚCLEO (Identidade & Acesso)
-- ============================================

-- PROFILES (Perfis de Usuário)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKSPACES (Empresas/Organizações)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    magic_code TEXT UNIQUE, -- Para onboarding/vinculação WhatsApp
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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
-- 2. MOTOR DE TAREFAS (Core)
-- ============================================

-- TASKS (Tarefas)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT, -- Suporta HTML do Rich Text
    status TEXT DEFAULT 'todo' NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
    priority TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    position DOUBLE PRECISION DEFAULT 0, -- Para ordenação drag & drop
    due_date TIMESTAMPTZ,
    is_personal BOOLEAN DEFAULT false NOT NULL, -- Para diferenciar Quick Add pessoal
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL se is_personal=true
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    origin_context JSONB, -- Metadados do WhatsApp { "audio_url", "sender_phone", "message_id" }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASK_ATTACHMENTS (Anexos de Tarefas)
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT, -- 'image', 'document', 'audio', 'video', 'other'
    file_name TEXT NOT NULL,
    file_size BIGINT, -- Tamanho em bytes
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
    metadata JSONB, -- Para logs automáticos: { "action": "status_changed", "old_value": "...", "new_value": "..." }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. FINANCEIRO (Transações)
-- ============================================

-- TRANSACTIONS (Transações Financeiras)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL, -- Integração Hub
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
-- 4. GESTÃO DE TIME
-- ============================================

-- WORKSPACE_INVITES (Convites para Workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ, -- Opcional: expiração do convite
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);

-- ============================================
-- 5. AUDITORIA
-- ============================================

-- AUDIT_LOGS (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- ex: 'deleted_task', 'invited_member', 'updated_workspace'
    details JSONB, -- Contexto adicional da ação
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ÍNDICES (Performance)
-- ============================================

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_is_personal ON public.tasks(is_personal, created_by) WHERE is_personal = true;
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_id ON public.transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON public.transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON public.workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON public.audit_logs(workspace_id);

-- ============================================
-- 7. TRIGGERS (Automação)
-- ============================================

-- Function: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger updated_at nas tabelas relevantes
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_workspaces
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_workspace_members
    BEFORE UPDATE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_transactions
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_workspace_invites
    BEFORE UPDATE ON public.workspace_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function: Criar profile automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Disparar criação de profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function: Adicionar owner como membro do workspace automaticamente
CREATE OR REPLACE FUNCTION public.handle_workspace_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    -- Adicionar owner como membro com role 'owner'
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Adicionar owner automaticamente como membro
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_workspace_owner_membership();

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) - Habilitação
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
-- 9. FUNCTIONS AUXILIARES (Para RLS)
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

-- ============================================
-- 10. RLS POLICIES - PROFILES
-- ============================================

-- Profiles: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Profiles: Usuários podem ver perfis de membros do mesmo workspace
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

-- Profiles: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- 11. RLS POLICIES - WORKSPACES
-- ============================================

-- Workspaces: Usuários podem ver workspaces onde são membros
CREATE POLICY "Users can view workspace if member"
    ON public.workspaces FOR SELECT
    USING (
        owner_id = auth.uid()
        OR is_workspace_member(id)
    );

-- Workspaces: Apenas owners podem atualizar
CREATE POLICY "Owners can update workspace"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Workspaces: Usuários autenticados podem criar workspaces
CREATE POLICY "Authenticated users can create workspace"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Workspaces: Apenas owners podem deletar
CREATE POLICY "Owners can delete workspace"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================
-- 12. RLS POLICIES - WORKSPACE_MEMBERS
-- ============================================

-- Workspace Members: Membros podem ver outros membros do mesmo workspace
CREATE POLICY "Members can view workspace members"
    ON public.workspace_members FOR SELECT
    USING (is_workspace_member(workspace_id));

-- Workspace Members: Apenas admins podem inserir membros
CREATE POLICY "Admins can add workspace members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

-- Workspace Members: Apenas admins podem atualizar roles
CREATE POLICY "Admins can update workspace member roles"
    ON public.workspace_members FOR UPDATE
    USING (is_workspace_admin(workspace_id))
    WITH CHECK (is_workspace_admin(workspace_id));

-- Workspace Members: Apenas admins podem remover membros (exceto owners)
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
-- 13. RLS POLICIES - TASKS
-- ============================================

-- Tasks: Visibilidade baseada em workspace ou propriedade pessoal
CREATE POLICY "Users can view workspace tasks"
    ON public.tasks FOR SELECT
    USING (
        -- Tarefa de workspace: usuário deve ser membro
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        -- Tarefa pessoal: usuário deve ser o criador
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
        OR
        -- Tarefa atribuída ao usuário
        (assignee_id = auth.uid())
    );

-- Tasks: Membros podem criar tarefas no workspace
CREATE POLICY "Workspace members can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        -- Se tiver workspace_id, deve ser membro
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        -- Se for pessoal, pode criar
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
    );

-- Tasks: Membros podem atualizar tarefas do workspace ou suas próprias
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

-- Tasks: Apenas criador ou admin podem deletar
CREATE POLICY "Creators or admins can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        created_by = auth.uid()
        OR
        (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
    );

-- ============================================
-- 14. RLS POLICIES - TASK_ATTACHMENTS
-- ============================================

-- Task Attachments: Seguem as mesmas regras de visibilidade da tarefa
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

-- Task Attachments: Membros podem anexar arquivos
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

-- Task Attachments: Uploader ou admin podem deletar
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
-- 15. RLS POLICIES - TASK_COMMENTS
-- ============================================

-- Task Comments: Seguem as mesmas regras de visibilidade da tarefa
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

-- Task Comments: Membros podem comentar
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

-- Task Comments: Autor pode editar/deletar próprio comentário
CREATE POLICY "Users can manage own comments"
    ON public.task_comments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
    ON public.task_comments FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 16. RLS POLICIES - TRANSACTIONS
-- ============================================

-- Transactions: Apenas membros do workspace podem ver
CREATE POLICY "Workspace members can view transactions"
    ON public.transactions FOR SELECT
    USING (is_workspace_member(workspace_id));

-- Transactions: Membros podem criar (viewers não podem criar)
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

-- Transactions: Membros podem atualizar
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

-- Transactions: Apenas admins ou criador podem deletar
CREATE POLICY "Admins or creators can delete transactions"
    ON public.transactions FOR DELETE
    USING (
        is_workspace_admin(workspace_id)
        OR
        created_by = auth.uid()
    );

-- ============================================
-- 17. RLS POLICIES - WORKSPACE_INVITES
-- ============================================

-- Workspace Invites: Apenas admins podem ver convites do workspace
CREATE POLICY "Admins can view workspace invites"
    ON public.workspace_invites FOR SELECT
    USING (is_workspace_admin(workspace_id));

-- Workspace Invites: Usuários podem ver convites enviados para seu email
CREATE POLICY "Users can view invites for own email"
    ON public.workspace_invites FOR SELECT
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

-- Workspace Invites: Apenas admins podem criar convites
CREATE POLICY "Admins can create workspace invites"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

-- Workspace Invites: Apenas admins podem atualizar convites
CREATE POLICY "Admins can update workspace invites"
    ON public.workspace_invites FOR UPDATE
    USING (is_workspace_admin(workspace_id))
    WITH CHECK (is_workspace_admin(workspace_id));

-- Workspace Invites: Apenas admins podem deletar convites
CREATE POLICY "Admins can delete workspace invites"
    ON public.workspace_invites FOR DELETE
    USING (is_workspace_admin(workspace_id));

-- ============================================
-- 18. RLS POLICIES - AUDIT_LOGS
-- ============================================

-- Audit Logs: Apenas admins do workspace podem ver logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        workspace_id IS NULL
        OR is_workspace_admin(workspace_id)
    );

-- Audit Logs: Sistema pode inserir logs (via service role ou function)
-- Nota: Para inserir via aplicação, use service_role ou função SECURITY DEFINER
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true); -- Pode ser restringido se necessário

-- ============================================
-- FIM DO SCHEMA
-- ============================================
