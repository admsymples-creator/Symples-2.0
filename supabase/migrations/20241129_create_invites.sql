-- Criação da tabela de convites que estava faltando ou não foi aplicada
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

-- Habilitar RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_workspace_invites
    BEFORE UPDATE ON public.workspace_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Políticas RLS (Recriando para garantir)

-- 1. Admins podem ver convites do workspace
CREATE POLICY "Admins can view workspace invites"
    ON public.workspace_invites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_invites.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 2. Usuários podem ver convites para seu email
CREATE POLICY "Users can view invites for own email"
    ON public.workspace_invites FOR SELECT
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

-- 3. Admins podem criar convites
CREATE POLICY "Admins can create workspace invites"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_invites.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 4. Admins podem atualizar convites
CREATE POLICY "Admins can update workspace invites"
    ON public.workspace_invites FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_invites.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_invites.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 5. Admins podem deletar convites
CREATE POLICY "Admins can delete workspace invites"
    ON public.workspace_invites FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_invites.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 6. Usuários podem atualizar convites (para aceitar) se o email bater
-- IMPORTANTE: Esta policy é necessária para o acceptInvite funcionar via RLS
CREATE POLICY "Users can accept invites for own email"
    ON public.workspace_invites FOR UPDATE
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );








