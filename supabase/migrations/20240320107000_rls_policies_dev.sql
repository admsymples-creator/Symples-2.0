-- Políticas RLS para DESENVOLVIMENTO/TESTE (sem autenticação)
-- ⚠️ ATENÇÃO: Use apenas para desenvolvimento local!
-- Execute este arquivo no SQL Editor do Supabase

-- Permitir que usuários anônimos possam inserir tarefas (APENAS PARA DEV)
CREATE POLICY "Allow anonymous insert tasks" 
ON public.tasks 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Permitir que usuários anônimos possam visualizar tarefas (APENAS PARA DEV)
CREATE POLICY "Allow anonymous select tasks" 
ON public.tasks 
FOR SELECT 
TO anon 
USING (true);

-- Permitir que usuários anônimos possam atualizar tarefas (APENAS PARA DEV)
CREATE POLICY "Allow anonymous update tasks" 
ON public.tasks 
FOR UPDATE 
TO anon 
USING (true);

-- Permitir que usuários anônimos possam deletar tarefas (APENAS PARA DEV)
CREATE POLICY "Allow anonymous delete tasks" 
ON public.tasks 
FOR DELETE 
TO anon 
USING (true);

-- NOTA: Estas políticas permitem acesso completo sem autenticação.
-- NUNCA use isso em produção! Apenas para desenvolvimento local.

