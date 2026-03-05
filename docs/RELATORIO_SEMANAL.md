# RELATÓRIO SEMANAL

_Data:_ 08/12/2025 (semana de referência)

## 1. Tudo que foi feito
- Assistente: seletor de workspaces no KanbanConfirmationCard, integrando logos e nomes e permitindo criar tarefa fora do workspace ativo.
- IA: extração inteligente de título, descrição (curta e completa), responsáveis citados e cálculo correto de datas relativas em pt-BR (timezone local).
- Persistência: tabela `assistant_messages` no Supabase para texto, áudio, imagem e componentes; sync entre localStorage e banco; suporte a mensagens de contexto e divisores.
- UI do assistente: feedback visual melhorado na gravação de áudio; timer corrigido e limpeza de timers.
- GlobalAssistantSheet: envia membros do workspace e dados de tarefas para IA; integra `invalidateTasksCache` e `router.refresh()` com `startTransition`.
- KanbanConfirmationCard: suporte a descrição completa/resumida e avatar ajustado para padrão.
- Correções de data/timezone: função `formatDateLocal` movida para módulo e aplicada em todas as extrações; bug de datas adiantadas resolvido.
- Atualização instantânea de tarefas: invalidação de cache e `router.refresh()` para exibir novas tarefas imediatamente.
- API `/api/ai/chat`: novos parâmetros `workspaceMembers` e `tasksData`; validação de `assigneeId`; função `calculateRelativeDate` aprimorada.
- Alinhamento PRD v2.4: reforço da GlobalAssistantSheet como canal único (FAB flutuante), generative UI e zero state com suggestion chips conforme regras do PRD.

## 2. Tudo que está sendo feito
- Limite de 3000 caracteres no TaskDetailModal com contador, bloqueio de conclusão e truncamento visual com "Ver mais/menos".
- Evolução do TaskRowMinify: indicadores completos (data com cores dinâmicas, status editável, picker de responsável com busca, contador de comentários, ações Focus⚡/Urgente⚠ no hover, barra de cor do grupo), layout em grid compacto e otimizações de imutabilidade/re-render.
- TaskGroup: indicador de cor via TaskSectionHeader, espaçamento/gap ajustado e uso de `useMemo` para cores.
- Otimizações de performance no TaskDetailModal: isolamento do timer em `AudioRecorderDisplay`, remoção de timeout artificial e memoização de handlers.
- Limpeza de UI: remoção de outlines/rings no editor e descrição.
- Continuidade do roadmap PRD: refinamento do onboarding (skip do WhatsApp, banner de desconexão), grid unificado de Home e lógica de smart triggers (⚡/🔥) alinhada ao cockpit semanal.

## 3. Travas e bloqueios
- Nenhum bloqueio crítico registrado na documentação até o momento. Se surgir dependência externa (ex.: ajuste de dados de workspace ou validação final de IA), registrar aqui. 
