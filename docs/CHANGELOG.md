# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Unreleased]

### Added
- **Múltiplos membros por tarefa (task_members):**
  - Tabela `task_members` para relacionar tarefas e usuários
  - Funções `addTaskMember`, `removeTaskMember`, `updateTaskMembers`
  - Picker com toggle múltiplo e exibição via `AvatarGroup`
- **Seletor de Workspaces no Card de Confirmação:**
  - Dropdown para selecionar workspace ao criar tarefa pelo assistente
  - Lista todos os workspaces do usuário com logo e nome
  - Permite criar tarefa em workspace diferente do ativo
  - Integrado ao KanbanConfirmationCard
- **Extração Inteligente de Informações pela IA:**
  - IA extrai título descritivo, descrição completa e resumida das mensagens/áudios
  - Detecção automática de responsáveis mencionados na mensagem ou áudio
  - Cálculo correto de datas relativas em português (timezone local)
  - Detecção de múltiplas tarefas e pergunta ao usuário (separadas ou subtarefas)
  - Melhoria na detecção de prazos (ex: "sexta-feira que vem" calcula corretamente)
- **Persistência de Mensagens no Banco de Dados:**
  - Sistema de armazenamento de mensagens do assistente no Supabase
  - Tabela `assistant_messages` com suporte a texto, áudio, imagem e componentes generativos
  - Sincronização entre localStorage e banco de dados
  - Suporte a mensagens de contexto e divisores
- **Pipeline unificado de áudio (/api/audio/process):**
  - Transcrição (Whisper) e chat (gpt-4o-mini) na mesma requisição
  - Persistência automática das mensagens de usuário e assistente
  - Retorno único com `transcription`, `message` e `componentData`

### Changed
- **TaskRowMinify / TaskDetailModal / Kanban:** agora exibem e editam múltiplos responsáveis usando `task_members`, mantendo `assignee_id` como responsável principal para compatibilidade.
- **KanbanConfirmationCard:**
  - Adicionado seletor de workspaces no footer do card
  - Avatar do responsável reduzido para `w-3.5 h-3.5` (padrão com outros ícones)
  - Suporte a descrição completa e resumida
- **GlobalAssistantSheet:**
  - Envio de lista de membros do workspace para IA detectar responsáveis
  - Envio de dados de tarefas quando necessário (resumos, pautas, etc.)
  - Melhor feedback visual durante gravação de áudio

### Fixed
- **Correção de Timezone em Datas:**
  - Função `formatDateLocal` criada para evitar problemas de UTC
  - Datas calculadas no timezone local do usuário
  - Correção de bug onde datas apareciam um dia antes
  - Aplicado em todas as extrações de data (relativas e absolutas)
- **Contador de Tempo do Áudio:**
  - Timer corrigido para atualizar corretamente durante gravação
  - Limpeza adequada de timers ao parar gravação
  - Feedback visual melhorado com tempo decorrido
- **Atualização Instantânea de Tarefas:**
  - Invalidação automática de cache após criar tarefa
  - `router.refresh()` para atualizar página sem reload manual
  - Tarefas aparecem imediatamente após criação pelo assistente
- **Erro de Renderização do Router:**
  - `router.refresh()` e `setMessages` envolvidos com `startTransition()`
  - Evita erro "Cannot update a component (Router) while rendering"
- **Duplicação de Função formatDateLocal:**
  - Função movida para nível do módulo (fora da função POST)
  - Resolve erro de build "the name formatDateLocal is defined multiple times"

### Technical
- **API de Chat (`/api/ai/chat`):**
  - Adicionado parâmetro `workspaceMembers` para detecção de responsáveis
  - Adicionado parâmetro `tasksData` para contexto de tarefas
  - Função `formatDateLocal` no nível do módulo para evitar duplicação
  - Função `calculateRelativeDate` melhorada para calcular datas relativas corretamente
  - Validação e correspondência de `assigneeId` retornado pela IA
- **Server Actions:**
  - `saveAssistantMessage`: Salva mensagens do assistente no banco
  - `loadAssistantMessages`: Carrega histórico de mensagens do banco
  - `saveAssistantMessages`: Salva múltiplas mensagens em lote
- **Componentes:**
  - `GlobalAssistantSheet`: Integração com `invalidateTasksCache` e `router.refresh()`
  - `KanbanConfirmationCard`: Adicionado seletor de workspaces e ajuste de avatar
  - Uso de `startTransition` para atualizações não urgentes de estado

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
  - Colunas: Drag Handle (40px) | Checkbox (24px) | Título (1fr) | Responsável (auto) | Data (90px) | Status (130px) | Menu (40px)
  - Coluna de Responsável posicionada antes da coluna de Data
  - Coluna de Responsável usa largura `auto` para se ajustar ao conteúdo (múltiplos avatares)
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
- **Comentários em TaskDetailModal**: Removida duplicação momentânea entre comentário otimista e dado real; paginação de histórico aumentada para 50 itens com botão "Carregar mais".
  - Corrigido `getWorkspaceMembers` para incluir o usuário atual mesmo que não esteja em `workspace_members`
  - Removido filtro que excluía o usuário logado da lista
  - Corrigido loop infinito de renderização em `TaskActionsMenu` e `TaskAssigneePicker`
- **Correção de TaskMembersPicker no TaskDetailModal**:
  - Corrigido problema onde `workspaceId` não estava sendo passado ao modal, fazendo com que apenas 1 membro aparecesse na lista
  - Adicionado `workspaceId` ao objeto `taskDetails` em `handleTaskClick` em `page.tsx`
  - Corrigido mapeamento de `getWorkspaceMembers` para tratar `member.user` como array ou objeto (consistente com `members.ts`)
  - Agora todos os membros do workspace são exibidos corretamente no picker
- **Correção de timezone na data do TaskDetailModal**: 
  - Corrigido problema onde a data aparecia com um dia antes devido à conversão de timezone
  - Implementada função `parseLocalDate` para criar datas no timezone local ao invés de UTC
- **Cores dinâmicas no TaskDatePicker**:
  - Implementada lógica de cores baseada no status da data e conclusão da tarefa
  - **Vermelho**: Data vencida (passada) e tarefa não completada
  - **Verde**: Data é hoje
  - **Cinza**: Data futura ou tarefa completada (mesmo que a data seja passada)
- **Editor Rich Text (TaskDetailModal)**:
  - Reconfigurado para usar apenas `StarterKit` com listas, blockquote e code block habilitados
  - Botões de bullet, lista numerada, citação e bloco de código voltam a funcionar
  - Estilos aplicados via Tailwind para listas, blockquote e code block
  - Placeholder reposicionado e ocultado no foco; descrição vazia normaliza para string vazia ao salvar para reexibir placeholder

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




