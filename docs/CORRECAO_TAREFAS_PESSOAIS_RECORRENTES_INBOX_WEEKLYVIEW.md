# Correcao: Tarefas pessoais recorrentes no Inbox e sumico no WeeklyView

## Contexto

Foi identificado que tarefas pessoais (especialmente recorrentes) estavam sendo promovidas indevidamente para o quadro de tarefas (Inbox do workspace). Em seguida, parte das recorrentes deixou de aparecer no WeeklyView.

## Causa raiz

- Regra de promocao no `updateTask()` promovia tarefa ao quadro quando havia `assignee_id` nao nulo.
- Em alguns fluxos, tarefas pessoais eram movidas para `workspace_id` ativo e `visible_on_board = true`.
- Para recorrencias, havia casos em que o pai da serie ficava fora da janela de busca por data; sem o pai no payload, a projecao de ocorrencias no WeeklyView nao era gerada.
- Em parte dos dados legados, recorrentes pessoais estavam com `assignee_id = null`, e o Home/WeeklyView consulta com `assigneeId = "current"`.

## Correcao aplicada

### 1) Trava no backend para promocao indevida

Arquivo: `lib/actions/tasks.ts`

- Promocao para quadro agora exige:
  - mudanca real de responsavel; e
  - responsavel diferente do usuario atual.
- Tarefas pessoais recorrentes nao sao promovidas para o quadro por essa regra.

### 2) Recuperacao de dados no banco (retroativo)

Migrations adicionadas:

- `supabase/migrations/20260210121000_revert_accidental_personal_tasks_from_board.sql`
  - reverte casos evidentes de tarefas pessoais promovidas por engano.

- `supabase/migrations/20260210123500_fix_recurring_personal_tasks_stuck_in_workspace_inbox.sql`
  - corrige series recorrentes pessoais presas no Inbox de workspace.

- `supabase/migrations/20260210125500_restore_assignee_for_personal_recurring_tasks_weeklyview.sql`
  - restaura `assignee_id = created_by` para recorrentes pessoais com assignee nulo.

### 3) Garantia de recorrencia no WeeklyView

Arquivo: `lib/actions/tasks.ts`

- Em contexto pessoal (`workspaceId = null` e `assigneeId = "current"`), `getTasks()` agora inclui pais recorrentes pessoais fora da janela de data.
- Isso permite que `ensureNextRecurrenceOccurrences()` gere ocorrencias reais dentro do intervalo visivel.

## Resultado esperado

- Tarefas pessoais recorrentes nao voltam a poluir Inbox do quadro.
- Recorrentes pessoais voltam a aparecer no WeeklyView/Home.
- Novas ocorrencias da serie continuam sendo geradas dentro da janela exibida.

## Ajuste de UX (workspace profissional)

Decisao temporaria para reduzir confusao operacional:

- No `WeeklyView` do workspace profissional, exibir tambem tarefas pessoais recorrentes
  do usuario (somente para visualizacao semanal).
- A separacao do quadro continua preservada:
  - tarefas pessoais recorrentes nao devem voltar para Inbox do board por essa regra.

Implementacao:

- `app/(main)/[workspaceSlug]/home/page.tsx`
  - busca adicional de tarefas pessoais no mesmo range quando `isPersonal = false`.
- `components/home/HomeWeeklyViewClient.tsx`
  - merge controlado de tarefas do workspace com tarefas pessoais recorrentes;
  - deduplicacao por `id`;
  - mesmo comportamento aplicado no refetch.

## Validacao sugerida

1. Criar tarefa pessoal recorrente no WeeklyView.
2. Atribuir para si mesmo e salvar.
3. Confirmar:
   - nao aparece no quadro de tarefas do workspace;
   - continua aparecendo no WeeklyView.
4. Navegar dias/semana e validar projecao de proximas ocorrencias.
