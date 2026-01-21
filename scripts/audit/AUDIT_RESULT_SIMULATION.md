# Relatório de Simulação e Análise de Fluxo
## Cenário: Exclusão de Cliente (`deleteClient`)

### 1. Estado Atual
- **Tabela `clients`**: Registro do cliente existe.
- **Tabela `transactions`**: Coluna `client_id` referência `clients(id)` com `ON DELETE SET NULL`.
- **Tabela `tasks`**: Sem vínculo direto com `clients`.

### 2. Simulação de Execução
Ao executar `deleteClient(clientId)`:

1.  **Ação de Banco de Dados**: `DELETE FROM clients WHERE id = clientId` é executado.
2.  **Constraint Trigger**: A chave estrangeira em `transactions` detecta a exclusão.
3.  **Resultado em Transações**: Todas as transações vinculadas a este cliente têm seu `client_id` definido como `NULL`.
    -   *Consequência*: O histórico financeiro perde a referência estruturada de "quem pagou". Se o campo `counterparty_name` (texto livre) não tiver sido preenchido com o nome do cliente, essa informação é perdida irrevogavelmente.
4.  **Resultado em Tarefas**:
    -   Como não há vínculo direto, as tarefas não são afetadas diretamente.
    -   Se havia uma transação ligando a tarefa ao cliente, essa transação agora é "anônima" (sem cliente), então indiretamente a tarefa perde o vínculo com o cliente no contexto financeiro.

### 3. Veredito de Integridade
- **Risco Alto**: A perda de histórico financeiro (quem pagou) é crítica.
- **Recomendação**:
    1.  Impedir exclusão de clientes com transações (Soft Delete / Arquivamento em vez de Delete físico).
    2.  Ou copiar o nome do cliente para `counterparty_name` antes de excluir (snapshot).

---

## Cenário: Criação de Transação Vinculada (`createTransaction`)

### 1. Estado Atual
- Recebe `client_id` e `related_task_id` como parâmetros opcionais independentes.

### 2. Análise de Fluxo
- Se o usuário selecionar uma Tarefa mas não selecionar um Cliente:
    - A transação é criada ligada à tarefa.
    - O `client_id` fica NULL (a menos que o usuário selecione manualmente).
    - **Falha de UX/Lógica**: O sistema deveria ser capaz de inferir o cliente a partir da tarefa, mas não pode porque `tasks` não tem `client_id`.

---

## Conclusão da Análise
A arquitetura atual depende excessivamente da integridade manual do usuário (selecionar tarefa E cliente corretamente). A falta de `client_id` em `tasks` cria um abismo semântico entre a execução do trabalho (Task) e a cobrança (Transaction/Client).
