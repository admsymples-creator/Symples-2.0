-- Permitir que qualquer usuário autenticado crie um workspace
CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que usuários vejam workspaces onde são membros ou donos
CREATE POLICY "Users can view their own workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = id AND user_id = auth.uid()
  )
);

-- Permitir update se for dono
CREATE POLICY "Owners can update their workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

-- POLICIES PARA WORKSPACE_MEMBERS

-- Permitir que usuários vejam suas associações
CREATE POLICY "Users can view their memberships"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Permitir que donos de workspace adicionem membros
CREATE POLICY "Workspace owners can add members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = workspace_id AND owner_id = auth.uid()
  )
);



