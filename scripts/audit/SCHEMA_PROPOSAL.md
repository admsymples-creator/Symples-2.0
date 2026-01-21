# Proposta de Atualização de Schema e Sincronização
## Objetivo
Resolver a desconexão entre Tarefas e Clientes, permitindo relatórios precisos e automação financeira.

## 1. Mudanças no Banco de Dados (Schema)

### Tabela `tasks`
Adicionar coluna para vínculo direto.

```sql
ALTER TABLE public.tasks
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_client_id ON public.tasks(client_id);
```

## 2. Estratégia de Migração de Dados (Backfill)

Como popular a nova coluna `client_id` para tarefas existentes?

1.  **Via Transações Existentes (Alta Confiança)**:
    -   Se uma tarefa tem uma transação vinculada, e essa transação tem um `client_id`, copiar esse `client_id` para a tarefa.
    -   *Script SQL*: `UPDATE tasks SET client_id = t.client_id FROM transactions t WHERE tasks.id = t.related_task_id AND t.client_id IS NOT NULL;`

2.  **Via Tags (Média Confiança)**:
    -   Usar o script de auditoria `audit_tag_client_mismatch.sql` para identificar tags que correspondem a nomes de clientes.
    -   Executar update baseado nessa correspondência (pode requerer revisão manual).

## 3. Mudanças na Lógica de Aplicação (Server Actions)

### `lib/actions/tasks.ts`
-   **createTask**: Aceitar `client_id` no payload.
-   **updateTask**: Permitir atualização de `client_id`.
-   **getTasks**: Incluir dados do cliente no join (para mostrar na UI).

### `lib/actions/finance.ts`
-   **createTransaction**:
    -   Se `related_task_id` for fornecido e `client_id` NÃO for: Buscar o `client_id` da tarefa e usar na transação automaticamente.
    -   Se ambos forem fornecidos, validar se batem (ou priorizar a seleção manual explícita).

## 4. Mudanças na Interface (UI)

### Componente `TaskDetailModal`
-   Adicionar um **Combobox/Select de Clientes** logo abaixo do título ou na sidebar de detalhes.
-   Ao selecionar um cliente, atualizar a tarefa via Server Action.
-   Exibir ícone/link do cliente na lista de tarefas (visual rápido).

## 5. Benefícios Esperados
1.  **Relatórios**: "Quantas tarefas fizemos para o Cliente X este mês?" (mesmo sem cobrança).
2.  **Automação**: Ao criar uma despesa/receita para a tarefa, o cliente já vem preenchido.
3.  **Integridade**: Se o cliente for deletado (Soft Delete recomendado), sabemos exatamente quais tarefas foram afetadas.
