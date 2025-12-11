-- Recarregar o cache do Schema do PostgREST
NOTIFY pgrst, 'reload config';

-- Remover policies antigas para evitar conflitos e garantir que estão atualizadas
DROP POLICY IF EXISTS "Admins can view workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Users can view invites for own email" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admins can create workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admins can update workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admins can delete workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Users can accept invites for own email" ON public.workspace_invites;

-- Garantir que RLS está ativo
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Recriar Policies

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
CREATE POLICY "Users can accept invites for own email"
    ON public.workspace_invites FOR UPDATE
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );




