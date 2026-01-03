# Oportunidades de Melhoria de Performance - Tela Financeiro

## Problemas Identificados

### 1. **Queries Duplicadas de Membership e Workspace ID**
- **Problema**: Múltiplas funções (`getFinanceMetrics`, `getTransactions`, `getProjections`, `getCashFlowForecast`, etc.) fazem a mesma query para:
  - Buscar `workspace_id` quando não fornecido
  - Verificar membership do usuário
- **Impacto**: 2-3 queries extras por função, multiplicado por várias chamadas
- **Solução**: Criar função helper que faz ambas as verificações em uma única query ou cache

### 2. **getProjections e getCashFlowForecast - Queries Sequenciais**
- **Problema**: 
  - `getProjections`: Faz 2 queries sequenciais (recurring + scheduled)
  - `getCashFlowForecast`: Faz 3 queries sequenciais (current month + recurring + scheduled)
- **Impacto**: Tempo de resposta ~2-3x maior do que necessário
- **Solução**: Executar queries em paralelo com `Promise.all`

### 3. **Processamento de Transações no Servidor**
- **Problema**: `FinanceContent` processa todas as transações no servidor:
  - Filtra por tipo (income/expense)
  - Mapeia campos
  - Calcula categorias
- **Impacto**: Processamento desnecessário no servidor, especialmente com 200 transações
- **Solução**: Mover processamento para o cliente ou otimizar queries no backend

### 4. **getTransactions - Limite Fixo de 200**
- **Problema**: Sempre busca 200 transações, mesmo quando não necessário
- **Impacto**: Transferência de dados desnecessária
- **Solução**: Usar limite dinâmico baseado no contexto ou paginação

### 5. **FinanceTabsClient - Carregamento Lazy**
- **Problema**: Dados de "Recorrentes" e "Planejamento" só carregam quando a aba é ativada
- **Impacto**: Experiência do usuário com delay ao trocar de aba
- **Solução**: Prefetch em background ou carregar dados iniciais no servidor

### 6. **Falta de Cache entre Abas**
- **Problema**: Dados são recarregados toda vez que a aba é ativada
- **Impacto**: Queries desnecessárias
- **Solução**: Implementar cache no cliente ou usar React Query

## Otimizações Propostas

### Prioridade Alta
1. ✅ Executar queries em paralelo em `getProjections` e `getCashFlowForecast`
2. ✅ Criar helper para verificação de membership/workspace_id
3. ✅ Otimizar processamento de transações no `FinanceContent`

### Prioridade Média
4. ⏳ Implementar prefetch de dados para abas inativas
5. ⏳ Adicionar cache entre abas no cliente
6. ⏳ Otimizar limite de transações baseado no contexto

### Prioridade Baixa
7. ⏳ Implementar paginação para transações
8. ⏳ Adicionar skeleton loading para melhor UX

