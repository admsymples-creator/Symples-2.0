# Considerações e Cuidados para Tarefas Recorrentes

## 🎨 UX (Experiência do Usuário)

### 1. **Indicadores Visuais**
- ✅ **Ícone de recorrência**: Adicionado ícone `RefreshCw` em azul para indicar tarefas recorrentes
- ⚠️ **Tooltip informativo**: Mostra o tipo de recorrência ao passar o mouse
- 🔄 **Consistência**: Usar o mesmo ícone em todos os componentes (TaskRowMinify, TaskRow, etc.)

### 2. **Feedback ao Usuário**
- ✅ **Confirmação de exclusão**: Modal especial para tarefas recorrentes perguntando se quer excluir apenas uma ou todas
- ⚠️ **Edição de tarefas recorrentes**: Considerar pergunta similar: "Editar apenas esta ou todas as futuras?"
- ⚠️ **Status de recorrência**: Mostrar visualmente quando uma recorrência terminou ou está pausada

### 3. **Informações Contextuais**
- ⚠️ **Próxima ocorrência**: Mostrar quando será a próxima tarefa da série
- ⚠️ **Contagem de ocorrências**: Mostrar quantas tarefas já foram criadas/quantas faltam (se houver limite)
- ⚠️ **Data de término**: Mostrar quando a recorrência termina (se definida)

### 4. **Ações Especiais**
- ⚠️ **Pausar/Retomar recorrência**: Permitir pausar a geração de novas tarefas sem excluir as existentes
- ⚠️ **Editar série**: Opção para editar todas as tarefas futuras de uma série
- ⚠️ **Concluir série**: Opção para marcar todas as tarefas de uma série como concluídas

## ⚡ Performance

### 1. **Queries no Banco de Dados**
- ✅ **Índices criados**: 
  - `idx_tasks_recurrence_parent_id` - Para buscar tarefas filhas
  - `idx_tasks_recurrence_type` - Para buscar tarefas recorrentes
  - `idx_tasks_recurrence_next_date` - Para otimizar geração de próximas ocorrências

### 2. **Geração Automática de Tarefas**
- ⚠️ **Cron Job / Background Job**: Implementar job para gerar próximas ocorrências automaticamente
  - Executar diariamente (ou com frequência adequada)
  - Buscar tarefas onde `recurrence_next_date <= TODAY`
  - Gerar próxima ocorrência e atualizar `recurrence_next_date`
  - Respeitar `recurrence_end_date` e `recurrence_count`
- ⚠️ **Batch processing**: Processar múltiplas tarefas em lote para eficiência
- ⚠️ **Limites de segurança**: Evitar gerar muitas tarefas de uma vez (ex: máximo 100 por execução)

### 3. **Cache e Otimização**
- ⚠️ **Cache de contagem**: Cachear contagem de tarefas relacionadas para evitar queries repetidas
- ⚠️ **Lazy loading**: Carregar informações de recorrência apenas quando necessário
- ⚠️ **Pagination**: Considerar paginação ao listar tarefas de uma série longa

### 4. **Queries Eficientes**
- ✅ **Query com `.or()`**: Usado para buscar parent + filhas em uma única query
- ⚠️ **Evitar N+1**: Sempre usar `.in()` quando buscar múltiplas tarefas relacionadas
- ⚠️ **Select específico**: Buscar apenas campos necessários, não `*`

## 🔧 Funcionalidades Futuras

### 1. **Geração de Ocorrências**
- ⚠️ **Implementar lógica de geração**: 
  - Diária: Adicionar 1 dia
  - Semanal: Adicionar 7 dias (ou dias específicos da semana)
  - Mensal: Adicionar 1 mês (respeitando último dia do mês)
  - Custom: Usar `recurrence_interval` em dias

### 2. **Limites e Validações**
- ✅ **Constraint no banco**: Trigger garante que apenas tarefas pessoais podem ter recorrência
- ⚠️ **Limite de ocorrências**: Validar `recurrence_count` máximo (ex: 1000)
- ⚠️ **Data de término**: Validar que `recurrence_end_date` é futura

### 3. **Edição Inteligente**
- ⚠️ **Editar uma vs todas**: Perguntar ao usuário se quer editar apenas a tarefa atual ou todas as futuras
- ⚠️ **Preservar histórico**: Manter tarefas passadas inalteradas quando editar série
- ⚠️ **Sincronização**: Garantir que edições na série pai não quebrem tarefas já geradas

### 4. **Cancelamento e Pausa**
- ⚠️ **Cancelar série**: Opção para cancelar todas as ocorrências futuras
- ⚠️ **Pausar geração**: Campo `recurrence_paused` para pausar sem excluir
- ⚠️ **Retomar série**: Permitir retomar série pausada

## 🐛 Casos de Borda

### 1. **Tarefas Concluídas**
- ⚠️ **Gerar mesmo se concluída?**: Decidir se tarefas concluídas ainda geram próximas ocorrências
- ⚠️ **Concluir série**: Opção para marcar todas como concluídas

### 2. **Datas Especiais**
- ⚠️ **Fins de semana**: Pular fins de semana em recorrências diárias?
- ⚠️ **Feriados**: Considerar calendário de feriados?
- ⚠️ **Último dia do mês**: Tratamento especial para recorrências mensais

### 3. **Tarefas Atrasadas**
- ⚠️ **Ocorrências perdidas**: Gerar tarefas que deveriam ter sido criadas mas não foram?
- ⚠️ **Backfill**: Opção para preencher ocorrências faltantes

### 4. **Deleção**
- ✅ **Exclusão em cascata**: ON DELETE CASCADE garante que excluir parent remove filhas
- ✅ **Confirmação especial**: Modal perguntando se quer excluir uma ou todas
- ⚠️ **Restaurar série**: Opção para restaurar série deletada?

## 📊 Monitoramento

### 1. **Métricas Importantes**
- ⚠️ **Quantidade de séries ativas**: Monitorar crescimento
- ⚠️ **Tarefas geradas por dia**: Acompanhar carga do sistema
- ⚠️ **Erros na geração**: Log de falhas na criação de ocorrências

### 2. **Alertas**
- ⚠️ **Série parada**: Alertar se série não gera novas tarefas há muito tempo
- ⚠️ **Limite próximo**: Alertar quando próximo de `recurrence_count`
- ⚠️ **Data de término**: Alertar próximo à `recurrence_end_date`

## 🔒 Segurança e Permissões

- ✅ **Apenas tarefas pessoais**: Constraint no banco garante isso
- ⚠️ **RLS (Row Level Security)**: Garantir que usuários só vejam suas próprias séries
- ⚠️ **Validação no cliente**: Validar no frontend também (UX melhor)

## 📝 Notas de Implementação

### Campos no Banco
- `recurrence_type`: 'daily' | 'weekly' | 'monthly' | 'custom'
- `recurrence_interval`: Para tipo 'custom' (ex: a cada 3 dias)
- `recurrence_end_date`: Data de término (NULL = sem fim)
- `recurrence_count`: Número máximo de ocorrências (NULL = sem limite)
- `recurrence_parent_id`: ID da tarefa original (NULL para parent)
- `recurrence_next_date`: Próxima data de geração (NULL se terminou)

### Lógica de Parent/Filha
- Parent: `recurrence_parent_id IS NULL` e `recurrence_type IS NOT NULL`
- Filhas: `recurrence_parent_id = <parent_id>`
- Buscar série: `WHERE recurrence_parent_id = <parent_id> OR id = <parent_id>`





