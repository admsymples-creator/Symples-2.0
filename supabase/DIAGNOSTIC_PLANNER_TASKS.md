# Diagnóstico: tarefas do planner não aparecem

## 1. Verificar políticas RLS na tabela `tasks`

No **SQL Editor** do Supabase, rode:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;
```

- Para **SELECT** deve existir ao menos uma política com `qual` permissiva (ex.: `true` ou condição que inclua `created_by = auth.uid()` para tarefas pessoais).
- A migration `20260130140000_ensure_planner_personal_tasks_visible.sql` adiciona a política "Users can select own personal tasks" para garantir leitura de tarefas pessoais.

## 2. Verificar se tarefas pessoais existem e são visíveis

```sql
-- Últimas 5 tarefas pessoais do usuário logado (rode no SQL Editor com sessão autenticada ou troque pelo seu user id)
SELECT id, title, due_date, workspace_id, created_by, created_at
FROM public.tasks
WHERE workspace_id IS NULL
  AND created_by = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

- Se retornar vazio mas você acabou de criar uma tarefa no planner, pode ser RLS bloqueando SELECT.
- Se retornar linhas, o banco está ok e o problema tende a ser no front (refetch/estado).

## 3. Verificar se o insert está sendo permitido

As políticas de **INSERT** em `tasks` devem permitir usuários autenticados (ex.: `WITH CHECK (true)`). Confira com a query do item 1.

## 4. Aplicar a migration

Se ainda não rodou as migrations locais/remotas:

```bash
npx supabase db push
# ou
npx supabase migration up
```

Isso aplica `20260130140000_ensure_planner_personal_tasks_visible.sql` e garante a política explícita para tarefas pessoais.
