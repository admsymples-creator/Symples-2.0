# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [2026-02-27] - Assistente IA + Restrição Mobile

### Added
- **Restrição mobile**: usuários em dispositivos móveis são redirecionados exclusivamente para `/assistant`. Rotas do dashboard (`/home`, `/{slug}/tasks`, `/kanban`, etc.) não são acessíveis via mobile
- **`proxy.ts`**: detecção de `User-Agent` mobile integrada ao proxy existente do Next.js 16 — sem arquivo `middleware.ts` separado
- **`lib/utils/sanitize-history.ts`**: utilitário compartilhado para sanitizar histórico de mensagens antes de enviar à API da IA

### Changed
- **`/api/ai/chat`**: reescrito com OpenAI function calling (`create_task` tool) — elimina heurísticas de palavras-chave e segunda chamada GPT para extração
- **`/api/audio/process`**: mesma abordagem de function calling para mensagens de áudio — consistência com o endpoint de texto
- **`app/auth/callback`**: login mobile redireciona para `/assistant` em vez de `/home`; fluxos de onboarding e convite válido inalterados
- **`lib/actions/assistant.ts`**: adicionado `updateAssistantMessage()` para persistir atualizações de `component_data` (ex: `confirmedStatus`)

### Fixed
- **Card de confirmação**: ao confirmar ou cancelar uma tarefa, o `KanbanConfirmationCard` agora atualiza `confirmedStatus` no estado local e no banco — o card permanece visível em modo readonly em vez de desaparecer
- **Stale closure no hook**: `sendMessage` usa `[...messages, userMsg]` para incluir a mensagem otimista no histórico
- **Dupla transcrição Whisper**: removida do hook `use-assistant-chat.ts` — usa apenas `/api/audio/process`
- **Info disclosure**: campo `details: errorData` removido das respostas de erro do chat

### Technical
- `GlobalAssistantSheet` e `use-assistant-chat.ts` unificados no uso de `sanitizeHistory()` com limite de 15 mensagens
- System prompt enriquecido com data atual (UTC-3/Brasília), membros do workspace e resumo de tarefas ativas

---

## [2026-02-25] - Drag and Drop Kanban

### Changed
- **Sensors otimizados**: PointerSensor distance reduzido de 8→5px para resposta mais ágil
- **TouchSensor**: Adicionado com delay 200ms e tolerance 5px para suporte mobile nativo
- **Collision detection customizado**: Combina `closestCenter` (cards) com `rectIntersection` (colunas vazias)
- **DragOverlay melhorado**: Drop animation com spring physics, preview com priority badge e status
- **Posicionamento fracionário**: Midpoint entre vizinhos reduz updates no banco de N para 1 row
- **Placeholder visual**: Card original com opacity 40% durante drag (em vez de esconder conteúdo)
- **Cursor**: `grab` em repouso → `grabbing` durante drag

### Fixed
- **Click vs Drag**: Removido workaround manual (~60 linhas) com `hasMovedRef`, `clickStartRef` e listeners globais no `window`. O `activationConstraint.distance` do dnd-kit já faz essa distinção nativamente
- **Memory leak**: Eliminados event listeners globais (`mousemove`/`mouseup`) que eram adicionados permanentemente no `window`

### Technical
- Adicionado `MeasuringStrategy.Always` para precisão contínua nas colisões
- `motion-safe:transition` respeita `prefers-reduced-motion` para acessibilidade
- `willChange: transform` aplicado apenas durante drag ativo (melhor GPU compositing)
- Removidos imports não utilizados (`useRef`, `useEffect`) do KanbanCard

---

## [Unreleased]

### Added
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

### Technical
- Implementado layout CSS Grid em TaskRowMinify para alinhamento vertical consistente
- Adicionado suporte para cores de grupo (nomeadas e hex) em TaskRowMinify e TaskGroup
- Melhorada imutabilidade em atualizações de estado para garantir re-renders corretos
- Adicionado `useMemo` para conversão de cores de grupo em TaskGroup




