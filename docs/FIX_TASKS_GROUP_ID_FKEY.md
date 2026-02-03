# Correção: Erro ao criar tarefa (FK tasks_group_id_fkey)

## Problema

Ao criar tarefas na página de Tarefas (visão por grupos) ou ao concluir uma tarefa recorrente, o usuário podia ver:

```
Erro ao criar tarefa: insert or update on table "tasks" violates foreign key constraint "tasks_group_id_fkey"
```

Isso ocorria quando o valor de `group_id` enviado não existia na tabela `task_groups` (grupo deletado, lista desatualizada ou troca de workspace).

## Solução implementada

### 1. Backend – `createTask` (`lib/actions/tasks.ts`)

- Antes do insert, se `data.group_id` for informado, é feita uma consulta em `task_groups` para validar existência e `workspace_id`.
- Só é aceito se o grupo existir e pertencer ao mesmo workspace da tarefa; caso contrário a tarefa é criada com `group_id: null` (inbox).
- Strings vazias em `group_id` são tratadas como `null`.

### 2. Backend – Recorrência (`lib/actions/tasks.ts`)

- Ao criar a próxima ocorrência (tarefa concluída), o `group_id` da tarefa atual é validado em `task_groups`.
- Se o grupo não existir ou for de outro workspace, a próxima ocorrência é criada com `group_id: null`.

### 3. Frontend – Validação ao adicionar (`tasks-page-client.tsx`)

- Na visão "Grupos", ao adicionar tarefa em uma coluna que não seja inbox, o código verifica se o id da coluna está em `availableGroups`.
- Se não estiver (grupo deletado/desatualizado), envia `group_id: null` e exibe o toast: "Grupo não encontrado; tarefa adicionada ao Backlog."

### 4. Frontend – Sanitização de `groupOrder` (`tasks-page-client.tsx`)

- Em `loadGroups`, a ordem de grupos (`groupOrder`) é sempre sanitizada: permanecem apenas `"inbox"` e ids que existem em `groupsData`.
- IDs de grupos deletados ou de outro workspace são removidos; a nova ordem é salva no `localStorage`.
- Ao trocar workspace ou aba, `groupOrder` é resetado (`setGroupOrder([])`) para não manter ids do workspace anterior.

## Referências

- Constraint no banco: `tasks.group_id` → `task_groups(id)` (migration `20251130_create_task_groups.sql`).
- Changelog: `docs/CHANGELOG.md` (entrada "Erro ao criar tarefa (FK tasks_group_id_fkey)").
