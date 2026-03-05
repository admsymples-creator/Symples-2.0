-- Garantir que tarefas pessoais (planner) sejam sempre visíveis para o criador
-- Útil se alguma política mais restritiva tiver sido aplicada manualmente no Supabase
-- Data: 2026-01-30

-- Política explícita: usuário autenticado pode SELECT tarefas onde é o criador e workspace_id é null (pessoal)
-- Em RLS, políticas permissivas são unidas com OR; esta garante visibilidade das tarefas do planner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks'
      AND policyname = 'Users can select own personal tasks'
  ) THEN
    CREATE POLICY "Users can select own personal tasks"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (
      (workspace_id IS NULL AND created_by = auth.uid())
    );
  END IF;
END
$$;

COMMENT ON POLICY "Users can select own personal tasks" ON public.tasks IS
  'Garante que tarefas criadas no planner (pessoais) apareçam para o usuário que as criou.';
