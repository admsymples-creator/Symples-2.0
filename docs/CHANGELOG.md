# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Unreleased]

### Added
- **Limite de Caracteres e Truncamento Visual na Descrição (TaskDetailModal)**:
  - Limite hard de 3000 caracteres para descrição de tarefas
  - Contador de caracteres no modo de edição (`${current}/${max}`)
  - Contador fica vermelho quando excede o limite
  - Mensagem de erro "Limite de caracteres excedido." quando excede
  - Botão "Concluir" desabilitado quando excede o limite
  - Truncamento visual no modo de visualização (max-h-40 = 160px)
  - Botão "Ver mais/Ver menos" para expandir/colapsar descrição longa
  - Overlay com gradiente branco na parte inferior do texto truncado
  - Detecção automática de altura do conteúdo para mostrar botão apenas quando necessário
  - Edição ao clicar na descrição (modo visualização)

- **TaskRowMinify - Indicadores Visuais Completos**:
  - **Data**: Date picker funcional com calendário, cores dinâmicas (vermelho para atrasado, verde para hoje)
  - **Status**: Badge editável com popover para mudança rápida de status
  - **Responsável**: Avatar picker com busca de membros, garantindo que usuário atual sempre aparece
  - **Comentários**: Indicador de contagem de comentários (aparece apenas quando há comentários)
  - **Focus (⚡)**: Botão para mover tarefa para próximo domingo (aparece no hover)
  - **Urgente (⚠)**: Botão para marcar como urgente e definir data para hoje (aparece no hover)
  - **Indicador de Cor do Grupo**: Barra vertical colorida à esquerda (1px) indicando cor do grupo

- **TaskRowMinify - Layout em Grid**:
  - Layout CSS Grid com colunas fixas para alinhamento vertical consistente
  - Colunas: Drag Handle (40px) | Título (1fr) | Data (90px) | Responsável (32px) | Status (100px) | Menu (40px)
  - Indicadores Focus, Urgente e Comentários aparecem no hover dentro da coluna do título

- **TaskGroup - Indicador de Cor**:
  - Círculo colorido ao lado do título do grupo (via TaskSectionHeader)
  - Suporte para cores nomeadas (red, blue, green, etc.) e hex (#ffffff)

- **Optimistic UI em TaskRowMinify**:
  - Todas as atualizações (data, status, responsável, focus, urgente) usam optimistic UI
  - Atualização instantânea da UI antes da chamada ao servidor
  - Rollback automático em caso de erro

### Changed
- **TaskRowMinify**: Altura reduzida de `h-14` (56px) para `h-11` (44px) para interface mais compacta
- **TaskGroup**: Espaçamento entre grupos aumentado de `gap-4` para `gap-6`
- **TaskGroup**: Margin-top adicionado nos títulos dos grupos (`mt-4`)

### Fixed
- **Correção de filtro na lista de membros**: Garantido que o usuário logado sempre aparece na lista de membros ao selecionar responsável de tarefa
  - Corrigido `getWorkspaceMembers` para incluir o usuário atual mesmo que não esteja em `workspace_members`
  - Removido filtro que excluía o usuário logado da lista
  - Corrigido loop infinito de renderização em `TaskActionsMenu` e `TaskAssigneePicker`
- **Correção de timezone na data do TaskDetailModal**: 
  - Corrigido problema onde a data aparecia com um dia antes devido à conversão de timezone
  - Implementada função `parseLocalDate` para criar datas no timezone local ao invés de UTC
- **Cores dinâmicas no TaskDatePicker**:
  - Implementada lógica de cores baseada no status da data e conclusão da tarefa
  - **Vermelho**: Data vencida (passada) e tarefa não completada
  - **Verde**: Data é hoje
  - **Cinza**: Data futura ou tarefa completada (mesmo que a data seja passada)

### Technical
- Implementado layout CSS Grid em TaskRowMinify para alinhamento vertical consistente
- Adicionado suporte para cores de grupo (nomeadas e hex) em TaskRowMinify e TaskGroup
- Melhorada imutabilidade em atualizações de estado para garantir re-renders corretos
- Adicionado `useMemo` para conversão de cores de grupo em TaskGroup
- Adicionada prop `isCompleted` ao `TaskDatePicker` para calcular cores dinâmicas baseadas no status da tarefa
- Implementada função `getDateColor()` no `TaskDatePicker` para determinar cor baseada em data e status de conclusão
- **Otimizações de Performance no TaskDetailModal**:
  - Isolado timer do gravador de áudio em componente memoizado `AudioRecorderDisplay` para evitar re-renders do modal inteiro
  - Removido `setTimeout` artificial de 50ms no carregamento de dados, usando `.then()` para encadear `loadBasicData()` e `loadExtendedData()`
  - Memoizado handler de descrição (`handleSaveDescription`) com `useCallback` para reduzir re-renders
  - Corrigido flickering visual removendo dependência de `task?.id` na condição `shouldShowSkeleton`
- **Remoção de Bordas Cinzas (UI/UX)**:
  - Removidos outlines e rings do componente Editor ao focar/clicar
  - Removidos outlines da descrição no modo de visualização
  - Adicionadas classes `outline-none`, `focus:outline-none`, `focus-visible:outline-none`, `active:outline-none`
  - Adicionado `tabIndex={-1}` na descrição para evitar foco via teclado
  - Removidos `focus-within:ring` e `focus-visible:ring` do Editor




