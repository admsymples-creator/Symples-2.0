-- Habilitar RLS nas tabelas
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS PARA WORKSPACES
-- ============================================================

-- 1. INSERT: Usuários autenticados podem criar workspaces (definindo-se como owner)
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
CREATE POLICY "Users can create their own workspaces" 
ON workspaces FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- 2. SELECT: Usuários podem ver workspaces onde são membros ou owners
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
CREATE POLICY "Users can view workspaces they belong to" 
ON workspaces FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
  )
  OR 
  owner_id = auth.uid()
);

-- 3. UPDATE: Apenas o owner pode atualizar o workspace
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
CREATE POLICY "Owners can update their workspaces" 
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());


-- ============================================================
-- POLÍTICAS PARA WORKSPACE_MEMBERS
-- ============================================================

-- 1. INSERT: Owners podem adicionar membros (incluindo a si mesmos logo após criar o workspace)
DROP POLICY IF EXISTS "Owners can add members" ON workspace_members;
CREATE POLICY "Owners can add members" 
ON workspace_members FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = workspace_members.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
);

-- 2. SELECT: Usuários podem ver suas próprias participações e de outros no mesmo workspace
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members" 
ON workspace_members FOR SELECT 
TO authenticated 
USING (
  -- O usuário é o próprio membro
  user_id = auth.uid()
  OR
  -- O usuário é membro do mesmo workspace
  EXISTS (
    SELECT 1 FROM workspace_members as wm
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
  )
  OR
  -- O usuário é owner do workspace (para ver membros antes mesmo de se inserir, tecnicamente redundante com a lógica de inserção mas boa prática)
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

-- 3. DELETE/UPDATE: Apenas owner pode remover/alterar membros (opcional por enquanto)
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;
CREATE POLICY "Owners can manage members"
ON workspace_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);






