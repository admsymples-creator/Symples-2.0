-- ============================================================
-- CORREÇÃO DE RECURSÃO INFINITA (RLS)
-- ============================================================

-- O erro 42P17 ocorre quando uma política de uma tabela consulta a própria tabela
-- sem usar uma função SECURITY DEFINER para "furar" o bloqueio.

-- Vamos redefinir as políticas de 'workspace_members' de forma segura.

-- 1. Remover política antiga e recursiva
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members; -- Caso exista do schema anterior

-- 2. Criar nova política NÃO-RECURSIVA para SELECT
CREATE POLICY "Users can view workspace members" 
ON workspace_members FOR SELECT 
TO authenticated 
USING (
  -- Caso 1: Eu posso ver meu próprio registro de membro (sem recursão)
  user_id = auth.uid()
  
  OR
  
  -- Caso 2: Eu posso ver registros do workspace se eu for membro dele
  -- Usamos a função SECURITY DEFINER 'is_workspace_member' para evitar o loop infinito
  is_workspace_member(workspace_id)
);

-- Nota: Certifique-se de que a função is_workspace_member existe e é SECURITY DEFINER.
-- Caso precise recriá-la para garantir:

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





