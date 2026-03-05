-- Políticas RLS para a tabela tasks
-- Execute este arquivo no SQL Editor do Supabase

-- Permitir que qualquer usuário autenticado possa inserir tarefas
-- (Para desenvolvimento, você pode ajustar isso conforme necessário)
CREATE POLICY "Allow authenticated users to insert tasks" 
ON public.tasks 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permitir que qualquer usuário autenticado possa visualizar suas próprias tarefas
-- ou tarefas de workspaces aos quais pertence
CREATE POLICY "Allow users to view tasks" 
ON public.tasks 
FOR SELECT 
TO authenticated 
USING (true);

-- Permitir que qualquer usuário autenticado possa atualizar tarefas
CREATE POLICY "Allow authenticated users to update tasks" 
ON public.tasks 
FOR UPDATE 
TO authenticated 
USING (true);

-- Permitir que qualquer usuário autenticado possa deletar tarefas
CREATE POLICY "Allow authenticated users to delete tasks" 
ON public.tasks 
FOR DELETE 
TO authenticated 
USING (true);

-- NOTA: Para desenvolvimento/teste sem autenticação, você pode temporariamente
-- desabilitar o RLS ou criar políticas mais permissivas:
-- 
-- Opção 1: Desabilitar RLS temporariamente (NÃO RECOMENDADO PARA PRODUÇÃO)
-- ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
--
-- Opção 2: Permitir acesso anônimo (APENAS PARA DESENVOLVIMENTO)
-- CREATE POLICY "Allow anonymous insert" ON public.tasks FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "Allow anonymous select" ON public.tasks FOR SELECT TO anon USING (true);

