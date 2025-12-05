-- 1. Forçar atualização do Cache do Supabase API
NOTIFY pgrst, 'reload config';

-- 2. Garantir permissões de acesso à tabela (caso o erro de 'table not found' seja permissão)
GRANT ALL ON public.workspace_invites TO postgres;
GRANT ALL ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;

-- 3. Remover Trigger existente para evitar o erro "already exists" e recriá-lo
DROP TRIGGER IF EXISTS set_updated_at_workspace_invites ON public.workspace_invites;

CREATE TRIGGER set_updated_at_workspace_invites
    BEFORE UPDATE ON public.workspace_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Limpar Policies antigas para recriar do zero (evita erros de duplicidade)
DROP POLICY IF EXISTS "Admins can view workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Users can view invites for own email" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admins can create workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admins can update workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admins can delete workspace invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Users can accept invites for own email" ON public.workspace_invites;

-- 5. Habilitar RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- 6. Recriar Policies Corretas

-- Admins podem ver
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

-- Usuários podem ver seus convites
CREATE POLICY "Users can view invites for own email"
    ON public.workspace_invites FOR SELECT
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

-- Admins podem criar
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

-- Admins podem atualizar
CREATE POLICY "Admins can update workspace invites"
    ON public.workspace_invites FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_invites.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Admins podem deletar
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

-- Usuários podem aceitar (update status)
CREATE POLICY "Users can accept invites for own email"
    ON public.workspace_invites FOR UPDATE
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );




