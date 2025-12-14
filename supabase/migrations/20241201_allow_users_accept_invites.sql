-- Permitir que usuários aceitem convites inserindo-se em workspace_members
-- Esta policy permite que um usuário se adicione ao workspace quando tiver um convite válido pendente

DROP POLICY IF EXISTS "Users can accept invites and add themselves" ON public.workspace_members;

CREATE POLICY "Users can accept invites and add themselves"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        -- Usuário pode se adicionar ao workspace se tiver um convite válido pendente
        EXISTS (
            SELECT 1 FROM public.workspace_invites
            WHERE workspace_invites.workspace_id = workspace_members.workspace_id
            AND workspace_invites.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
            AND workspace_invites.status = 'pending'
            AND (workspace_invites.expires_at IS NULL OR workspace_invites.expires_at > NOW())
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Nota: Esta policy funciona em conjunto com a lógica de acceptInvite que:
-- 1. Verifica se o convite existe e está pendente
-- 2. Valida que o email do usuário logado bate com o do convite
-- 3. Insere o usuário como membro com a role do convite
-- 4. Atualiza o status do convite para 'accepted'







