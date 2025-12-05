**# SYMPLES — Journal de Preview**

Este arquivo registra, em tempo quase real, o estado do ambiente de **preview** do Symples.
Cada entrada deve conter **data e hora** e ser organizada em três blocos:
melhorias/bugs/features entregues, trabalho em andamento e próximos passos imediatos.

---

## 2025-01-XX - [Hora]

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ TaskRowMinify - Checkbox de Conclusão com Optimistic UI
- **Checkbox de Conclusão**: Adicionado checkbox ao lado esquerdo do título para marcar tarefa como concluída
  - Posicionado após o drag handle na coluna do grid
  - Visual: Checkbox verde quando marcado (`data-[state=checked]:bg-green-500`)
  - Título com `line-through` quando tarefa está concluída
  - Integração completa com sistema de status (marca como "done" quando marcado, volta para "todo" quando desmarcado)
  
- **Optimistic UI Pattern**:
  - Atualização instantânea da interface antes da chamada ao servidor
  - Rollback automático em caso de erro, restaurando status anterior
  - Toast de feedback (sucesso/erro) para melhor UX
  - Callback `onTaskUpdatedOptimistic` para sincronização de estado local
  
- **Layout Atualizado**: Grid ajustado para incluir checkbox
  - Colunas: `grid-cols-[40px_24px_1fr_90px_32px_130px_40px]`
  - Drag Handle (40px) | Checkbox (24px) | Título (1fr) | Data (90px) | Responsável (32px) | Status (130px) | Menu (40px)

#### 🎯 TaskRowMinify - Indicadores Visuais Completos
- **Layout em Grid**: Implementado CSS Grid com colunas fixas para alinhamento vertical
  - Colunas: Drag Handle | Checkbox | Título (com hover indicators) | Data | Responsável | Status | Menu
  - Altura reduzida para `h-11` (44px) para interface mais compacta
  - Gap de `gap-1` entre colunas para espaçamento consistente
  
- **Indicadores Funcionais**:
  - **Data**: Date picker com calendário, cores dinâmicas (vermelho para atrasado, verde para hoje, cinza para futuro)
  - **Status**: Badge editável com popover para mudança rápida de status
  - **Responsável**: Avatar picker garantindo usuário atual sempre disponível na lista
  - **Comentários**: Contador que aparece apenas quando `commentCount > 0`
  - **Focus (⚡)**: Botão para mover tarefa para próximo domingo (aparece no hover, ativo quando data é próximo domingo)
  - **Urgente (⚠)**: Botão para marcar como urgente e definir data para hoje (aparece no hover, ativo quando urgente ou data é hoje)
  
- **Indicador de Cor do Grupo**: Barra vertical colorida à esquerda (`w-1`, `absolute left-0`)
  - Suporte para cores nomeadas (red, blue, green, etc.) e hex (#ffffff)
  - Mapeamento automático via `getGroupColorClass()`
  - Exibido apenas quando `groupColor` está definido

- **Optimistic UI**: Todas as atualizações (data, status, responsável, focus, urgente) usam padrão optimistic
  - Atualização instantânea da UI antes da chamada ao servidor
  - Rollback automático em caso de erro
  - Callback `onTaskUpdatedOptimistic` para sincronização de estado local
  - Garantia de imutabilidade em atualizações de estado

#### 🎨 TaskGroup - Melhorias Visuais
- **Indicador de Cor**: Círculo colorido ao lado do título do grupo (via `TaskSectionHeader`)
  - Conversão automática de cores nomeadas para hex
  - Exibido apenas quando `groupColor` está definido
  
- **Espaçamento**: 
  - Gap entre grupos aumentado para `gap-6` (24px) em `TaskList`
  - Margin-top nos títulos: `mt-4` (16px) para melhor separação visual

#### 🔧 Melhorias Técnicas
- **Conversão de Cores**: Função `extractColorFromClass()` em `TaskList` para extrair nome de cor de classes Tailwind
- **Memoização**: `useMemo` para conversão de cores em `TaskGroup` para evitar recálculos
- **Tipos**: Adicionado suporte para `groupColor`, `commentCount`, `commentsCount`, `priority` em interfaces

---

## 2025-12-03 - 21:41 (Data a ser preenchida)

### 1. Melhorias, bugs e features implementadas em preview

#### 🎯 Sistema de Drag & Drop e Persistência de Posição
- **Implementação de Midpoint Calculation para cálculo de posição**
  - Algoritmo matemático usando média entre vizinhos (floating point)
  - Posições calculadas: Topo (`nextTask.position / 2`), Meio (`(prev + next) / 2`), Final (`prev + 1000`)
  - Evita colisões e permite inserções infinitas entre itens
  - Reduz drasticamente bulk updates (apenas em casos raros de colisão)

- **Funções RPC no Banco de Dados (Supabase)**
  - `move_task(UUID, DOUBLE PRECISION)`: Atualiza posição individual
    - Retorna `JSONB` com informações detalhadas de sucesso/erro
    - Usa `SECURITY DEFINER` para contornar políticas RLS
    - Validação de permissões (workspace membership ou ownership)
    - Verificação pós-update usando `RETURNING` clause
  - `move_tasks_bulk(JSONB)`: Atualiza múltiplas posições em lote
    - Processamento atômico para melhor performance
    - Validação individual de permissões

- **Server Actions Otimizadas (`lib/actions/tasks.ts`)**
  - `updateTaskPosition()`: Corrigida para lidar com retorno VOID/JSONB
  - `updateTaskPositionsBulk()`: Bulk update via RPC
  - Fallback automático para update direto se RPC não disponível
  - Verificação pós-update no banco para garantir persistência

- **Lógica de Cálculo no Frontend (`app/(main)/tasks/page.tsx`)**
  - Cálculo de posição apenas para item movido (não recalcula toda lista)
  - Bulk update apenas em caso raro de colisão (espaço < 0.00001)
  - Estado local como source of truth com atualização otimista
  - Logs detalhados para debugging

- **Scripts SQL de Manutenção**
  - `SCRIPT_CORRIGIR_TIPO_POSICAO.sql`: Corrige tipo INTEGER → DOUBLE PRECISION
  - `SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql`: Verifica e atualiza função
  - `SCRIPT_VERIFICAR_POSICOES_SALVAS.sql`: Diagnóstico de posições
  - `SCRIPT_REFRESH_TODAS_RPCS.sql`: Refresh completo do schema cache

#### 🐛 Correções de Bugs
- **Erro "invalid input syntax for type integer"**
  - Corrigido tipo do parâmetro `p_new_position` de INTEGER para DOUBLE PRECISION
  - Todos os scripts SQL atualizados para remover versões com INTEGER

- **Erro "Posição não foi atualizada corretamente"**
  - Corrigida lógica de verificação pós-update usando `RETURNING` clause
  - Removida verificação de `data` retornada pela RPC (retorna VOID)
  - Server Action agora verifica apenas `error` da RPC

- **Bulk Updates Desnecessários**
  - Antes: Recalculava posições de TODAS as tarefas a cada movimento
  - Agora: Calcula posição apenas para item movido (99% dos casos)
  - Bulk update apenas quando espaço entre vizinhos < 0.00001

### 2. O que está sendo trabalhado no momento

- **Validação e testes do sistema de drag & drop**
  - Testes de persistência de posição após recarregar página
  - Validação de cálculo de posição em diferentes cenários (topo, meio, final)
  - Verificação de performance com listas grandes (100+ tarefas)

- **Documentação técnica**
  - Atualização do PRD com detalhes do sistema de drag & drop
  - Documentação dos scripts SQL de manutenção
  - Guia de troubleshooting para problemas de persistência

### 3. Próximos passos

#### 🎯 Curto Prazo (Próximas 1-2 semanas)
1. **Otimizações de Performance**
   - Implementar debounce para movimentos rápidos de drag & drop
   - Cache de posições calculadas para evitar recálculos desnecessários
   - Lazy loading de tarefas em listas muito grandes

2. **Melhorias de UX**
   - Feedback visual durante drag & drop (loading states)
   - Animações suaves ao reordenar tarefas
   - Indicador visual quando posição está sendo salva

#### 🚀 Médio Prazo (Próximas 3-4 semanas)
3. **Sistema de Histórico de Posições**
   - Log de mudanças de posição para auditoria
   - Possibilidade de reverter ordem para versão anterior
   - Visualização de histórico de reordenações

4. **Drag & Drop Multi-seleção**
   - Selecionar múltiplas tarefas e mover em lote
   - Manter ordem relativa ao mover grupo de tarefas
   - Otimização de bulk updates para múltiplas tarefas

---

## 2025-12-03 - 09:19

### 1. Melhorias, bugs e features implementadas em preview

#### 🔒 Correções Críticas de Segurança
- **Correção de vazamento de dados entre workspaces** (`lib/actions/tasks.ts`)
  - Implementada verificação de membro do workspace antes de buscar tarefas
  - Fail-safe: retorna array vazio se `workspaceId` não for especificado (exceto aba "Minhas")
  - Lógica de filtro corrigida com três estados distintos (undefined, null, workspaceId)
  - Previne exposição acidental de tarefas de múltiplos workspaces

- **Sincronização da página Minify com workspace ativo**
  - Página `/tasks/minify` agora lê workspace da URL (`?w=WORKSPACE_ID`)
  - Sincroniza corretamente com a seleção da sidebar

#### ✨ Melhorias de UX/UI
- **TaskStatusPicker**: Novo componente para edição inline de status diretamente no `TaskRow`
  - Status badge agora é clicável e editável sem abrir modal completo
  - Feedback visual com chevron sutil no hover
  - Popover abre para baixo com todos os status disponíveis
  - Transições suaves e cursor pointer para melhor affordance

- **Correção de filtro na lista de membros**
  - Garantido que o usuário logado sempre aparece na lista ao selecionar responsável de tarefa
  - Corrigido `getWorkspaceMembers` para incluir o usuário atual mesmo que não esteja em `workspace_members`
  - Removido filtro que excluía incorretamente o usuário logado

#### 🐛 Correções de Bugs
- **Correção de loops infinitos de renderização**
  - Corrigido loop em `TaskActionsMenu` e `TaskAssigneePicker`
  - Removida dependência de arrays nas dependências do `useEffect`
  - Adicionado cleanup adequado para cancelar requisições assíncronas pendentes
  - Otimizado `TaskAssigneePicker` para buscar membros automaticamente sem causar re-renders

#### 🏗️ Refatoração Arquitetural
- **Aplicação da arquitetura MINIFY v2 no sistema real de tasks**
  - Estado local como source of truth (sem sincronização via `useEffect`)
  - Drag & Drop unificado para modos `list` e `kanban`
  - Backend em background (chamadas não bloqueiam UI)
  - Remoção de `router.refresh()` desnecessários
  - Atualizações otimistas (UI primeiro, backend depois)

#### ⚡ Melhorias de Performance
- Sistema de cache de tarefas com TTL configurável
- Preload inteligente de dados relacionados
- Redução de chamadas desnecessárias ao Supabase
- Carregamento paralelo de tarefas e grupos usando `Promise.all()`

### 2. O que está sendo trabalhado no momento

- **Refinamento do sistema de tasks**
  - Consolidação da arquitetura MINIFY v2 em todos os componentes de tasks
  - Otimização de performance e redução de re-renders
  - Melhoria da consistência entre modos de visualização (lista, kanban, minify)

- **Testes e validação das correções de segurança**
  - Validação do isolamento de workspaces em diferentes cenários
  - Testes de permissões e verificação de membros
  - Auditoria de possíveis vazamentos de dados

- **Documentação técnica**
  - Atualização do PRD e Design System
  - Criação do journal de preview (este arquivo)
  - Documentação de padrões arquiteturais (MINIFY v2)

### 3. Próximos passos

#### 🎯 Curto Prazo (Próximas 1-2 semanas)
1. **Detalhes de Tarefas 100% (Arquivos, Áudio, etc.)**
   - Expandir `TaskDetailModal` para suportar totalmente:
     - Upload múltiplo de arquivos com preview e gerenciamento (renomear, remover)
     - Upload e playback de áudios (usuário e WhatsApp/n8n)
     - Sincronização completa com `task_attachments` e Supabase Storage
     - Estados de upload e tratamento de erro robustos

2. **Gestão de Usuários (User Management Completo)**
   - Evoluir módulo de membros/time para:
     - Gerenciar roles detalhadas (owner, admin, member, viewer) com permissões claras
     - Interface de administração de usuários (ativar/desativar, reset de permissões)
     - Logs de auditoria para ações sensíveis (remoção de membros, mudança de role)

#### 🚀 Médio Prazo (Próximas 3-4 semanas)
3. **E-mails Transacionais com Resend**
   - Integrar Resend para envio de:
     - Convites de workspace (`workspace_invites`)
     - Notificações de tarefa (atribuição, mudança de status, comentários)
     - E-mails de onboarding e reset de senha
   - Criar camada de abstração (`lib/email/`) para centralizar templates

4. **Playbook Operacional (Onboarding & Sucesso do Cliente)**
   - Definir fluxo recomendado para novos clientes (primeiros 7 dias)
   - Sequência de ações guiadas dentro do produto (checklist in-app)
   - Templates de mensagens para suporte/concierge via WhatsApp
   - Refletir playbook na UI (empty states, tooltips, sugestões do Assistente IA)

#### 🌟 Longo Prazo (Próximos 2-3 meses)
5. **Assistente com IA (Versão 2.0)**
   - Evoluir página `/assistant` para:
     - Suportar comandos estruturados ("resuma minha semana", "mostre despesas acima de 1k")
     - Responder com componentes ricos (cards de tarefa, gráficos financeiros, atalhos)
     - Contextualizar respostas com workspace atual, perfil do usuário e histórico
   - Integrar melhor com n8n para automações disparadas pelo Assistente

6. **Integração WhatsApp + Symples + n8n (Ciclo Fechado)**
   - Consolidar fluxo ponta-a-ponta:
     - WhatsApp → n8n → Symples (criação/atualização de tarefas, transações, comentários)
     - Symples → n8n → WhatsApp (confirmações, lembretes, alertas inteligentes)
   - Garantir rastreabilidade completa:
     - Origem claramente marcada no `origin_context`
     - Logs de auditoria para cenários críticos (falhas de parsing, mensagens ignoradas)
   - Documentar fluxo em diagrama e guia técnico (`docs/INTEGRACAO_WHATSAPP.md`)


