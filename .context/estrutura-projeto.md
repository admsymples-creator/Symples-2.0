# Estrutura do Projeto - Symples v2

Este documento apresenta a árvore completa de pastas e arquivos do sistema após a refatoração estrutural (Clean Architecture).

## 📁 Estrutura de Diretórios

```
symples-v2/
│
├── 📁 app/
│   ├── 📁 (auth)/
│   │   ├── 📁 login/
│   │   │   └── page.tsx
│   │   └── 📁 onboarding/
│   │       └── page.tsx
│   │
│   ├── 📁 (main)/
│   │   ├── 📁 [workspaceSlug]/
│   │   │   └── 📁 tasks/
│   │   │       └── page.tsx
│   │   │
│   │   ├── 📁 assistant/
│   │   │   └── page.tsx
│   │   │
│   │   ├── 📁 billing/
│   │   │   └── page.tsx
│   │   │
│   │   ├── 📁 design-system/
│   │   │   └── page.tsx
│   │   │
│   │   ├── 📁 finance/
│   │   │   └── page.tsx
│   │   │
│   │   ├── 📁 home/
│   │   │   └── page.tsx
│   │   │
│   │   ├── 📁 item-da-lista/
│   │   │   └── page.tsx
│   │   │
│   │   ├── layout.tsx
│   │   │
│   │   ├── 📁 settings/
│   │   │   ├── page.tsx
│   │   │   └── settings-client.tsx
│   │   │
│   │   ├── 📁 tasks/
│   │   │   ├── 📁 error/
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 share/
│   │   │   │   └── 📁 [token]/
│   │   │   │       └── page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── task-dialog.tsx
│   │   │   └── tasks-view.tsx
│   │   │
│   │   └── 📁 team/
│   │       └── page.tsx
│   │
│   ├── 📁 api/
│   │   ├── 📁 ai/
│   │   │   ├── 📁 extract-task-info/
│   │   │   │   └── route.ts
│   │   │   └── 📁 summarize/
│   │   │       └── route.ts
│   │   │
│   │   ├── 📁 audio/
│   │   │   └── 📁 transcribe/
│   │   │       └── route.ts
│   │   │
│   │   └── 📁 webhooks/
│   │       └── 📁 n8n/
│   │           └── route.ts
│   │
│   ├── 📁 auth/
│   │   └── 📁 callback/
│   │       └── route.ts
│   │
│   ├── 📁 design-lab/
│   │   ├── 📁 login/
│   │   │   └── page.tsx
│   │   ├── 📁 onboarding/
│   │   │   └── page.tsx
│   │   └── 📁 tasks/
│   │       └── page.tsx
│   │
│   ├── 📁 invite/
│   │   └── 📁 [token]/
│   │       └── page.tsx
│   │
│   ├── error.tsx
│   ├── favicon.ico
│   ├── favicon.ico.png
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
│
├── 📁 components/
│   ├── 📁 assistant/
│   │   └── AIOrb.tsx
│   │
│   ├── 📁 debug/
│   │   └── minify-workspace-sync.tsx
│   │
│   ├── 📁 finance/
│   │   ├── CreateTransactionModal.tsx
│   │   └── FinanceClientComponents.tsx
│   │
│   ├── 📁 home/
│   │   ├── DayColumn.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskRow.tsx
│   │   ├── WeeklyView.tsx
│   │   └── WorkspaceCard.tsx
│   │
│   ├── 📁 landing/
│   │   ├── LoginForm.tsx
│   │   └── OnboardingWizard.tsx
│   │
│   ├── 📁 layout/
│   │   ├── AppShell.tsx
│   │   ├── GlobalSearch.tsx
│   │   ├── Header.tsx
│   │   ├── NotificationsPopover.tsx
│   │   ├── Sidebar.tsx
│   │   ├── UserNav.tsx
│   │   └── WorkspaceUrlSync.tsx
│   │
│   ├── 📁 modals/
│   │   └── confirm-modal.tsx
│   │
│   ├── 📁 providers/
│   │   ├── SidebarProvider.tsx
│   │   └── UIScaleProvider.tsx
│   │
│   ├── 📁 tasks/
│   │   ├── AttachmentCard.tsx
│   │   ├── AudioMessageBubble.tsx
│   │   ├── Avatar.tsx
│   │   ├── CreateTaskFromAudioModal.tsx
│   │   ├── GroupActionMenu.tsx
│   │   ├── KanbanCard.tsx
│   │   ├── KanbanEmptyCard.tsx
│   │   ├── minify-workspace-sync.tsx
│   │   ├── 📁 pickers/
│   │   │   ├── TaskAssigneePicker.tsx
│   │   │   ├── TaskDatePicker.tsx
│   │   │   └── TaskStatusPicker.tsx
│   │   ├── QuickTaskAdd.tsx
│   │   ├── TaskActionsMenu.tsx
│   │   ├── TaskBoard.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskDetailModal.tsx
│   │   ├── TaskGroup.tsx
│   │   ├── TaskGroupEmpty.tsx
│   │   ├── TaskImageLightbox.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskListView.tsx
│   │   ├── TaskRow.tsx
│   │   ├── TaskRowMinify.tsx (✅ Layout Grid, Indicadores Visuais, Optimistic UI)
│   │   ├── TaskSectionHeader.tsx
│   │   └── ViewOptions.tsx
│   │
│   ├── 📁 ui/
│   │   ├── alert-dialog.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── command.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── editor.tsx
│   │   ├── EmptyState.tsx
│   │   ├── inline-text-edit.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── slider.tsx
│   │   ├── StatePage.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   └── tooltip.tsx
│   │
│   └── components.json
│
├── 📁 docs/
│   ├── EXECUTAR_SCHEMA.md
│   ├── FIX_SCHEMA_CACHE.md
│   ├── MIGRACAO_TASK_COMMENTS.md
│   ├── STORAGE_SETUP.md
│   └── VERIFICAR_TASK_COMMENTS.md
│
├── 📁 hooks/
│   ├── use-file-upload.ts
│   ├── use-task-cache.ts
│   ├── use-task-preload.ts
│   └── use-tasks.ts
│
├── 📁 lib/
│   ├── 📁 actions/
│   │   ├── attachments.ts
│   │   ├── auth.ts
│   │   ├── dashboard.ts
│   │   ├── finance.ts
│   │   ├── members.ts
│   │   ├── onboarding.ts
│   │   ├── task-details.ts
│   │   ├── task-groups.ts
│   │   ├── tasks.ts (✅ Centralizado: contém todas as Server Actions de tarefas)
│   │   ├── user.ts
│   │   └── workspace-settings.ts
│   │
│   ├── 📁 config/
│   │   └── tasks.ts
│   │
│   ├── 📁 supabase/
│   │   ├── client.ts
│   │   ├── index.ts
│   │   └── server.ts
│   │
│   ├── group-actions.ts
│   ├── motion.ts
│   └── utils.ts
│
├── 📁 public/
│   ├── file.svg
│   ├── globe.svg
│   ├── logo-black.svg
│   ├── logo-dock.ico
│   ├── logo-dock.png
│   ├── logo.avif
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── 📁 supabase/
│   ├── 📁 migrations/
│   │   ├── 20240320100000_add_position_to_tasks.sql
│   │   ├── 20240320101000_create_task_comments.sql
│   │   ├── 20240320102000_fix_due_date_and_triggers.sql
│   │   ├── 20240320103000_fix_onboarding_rls.sql
│   │   ├── 20240320104000_fix_recursion_rls.sql
│   │   ├── 20240320105000_fix_invites_cache.sql
│   │   ├── 20240320106000_final_fix_invites.sql
│   │   ├── 20240320107000_rls_policies_dev.sql
│   │   ├── 20240320108000_rls_policies.sql
│   │   ├── 20240321_fix_rls.sql
│   │   ├── 20241129_create_invites.sql
│   │   ├── 20250101_create_move_task_rpc.sql (✅ RPC para atualização de posição)
│   │   ├── 20250101_create_move_tasks_bulk_rpc.sql (✅ RPC para bulk update)
│   │   ├── 20251129162918_add_task_details_columns.sql
│   │   ├── 20251129214812_create_task_attachments_bucket.sql
│   │   ├── 20251130_create_task_groups.sql
│   │   └── 20251201_validate_subtasks.sql
│   │
│   ├── EXECUTAR_SCHEMA_AMBOS.md
│   ├── MIGRATION_ADD_NEW_FIELDS.sql
│   ├── MIGRATION_ADD_WORKSPACE_LOGO.sql
│   ├── MIGRATION_ADICIONAR_CAMPOS_FALTANTES.sql
│   ├── MIGRATION_ADICIONAR_WHATSAPP_PROD.sql
│   ├── MIGRATION_FIX_PROFILE_UPDATED_AT.sql
│   ├── MIGRATION_FIX_WORKSPACE_RLS.sql
│   ├── MIGRATION_FIX_WORKSPACE_UPDATED_AT.sql
│   ├── MIGRATION_STORAGE_POLICIES.sql
│   ├── schema_v2_master.sql
│   ├── schema.sql
│   ├── SCRIPT_COMPARAR_DEV_PROD.sql
│   ├── SCRIPT_CORRIGIR_TIPO_POSICAO.sql (✅ Corrige tipo INTEGER → DOUBLE PRECISION)
│   ├── SCRIPT_CRIAR_MOVE_TASK.sql (✅ Cria/atualiza função move_task)
│   ├── SCRIPT_REFRESH_BULK_CACHE.sql (✅ Refresh cache para move_tasks_bulk)
│   ├── SCRIPT_REFRESH_SCHEMA_CACHE.sql (✅ Refresh cache para move_task)
│   ├── SCRIPT_REFRESH_TODAS_RPCS.sql (✅ Refresh completo de todas as RPCs)
│   ├── SCRIPT_TESTAR_MOVE_TASK.sql (✅ Teste direto da função RPC)
│   ├── SCRIPT_VALIDACAO_PROD.sql
│   ├── SCRIPT_VALIDAR_NOVOS_CAMPOS.sql
│   ├── SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql (✅ Verifica e atualiza move_task)
│   ├── SCRIPT_VERIFICAR_POSICOES_SALVAS.sql (✅ Diagnóstico de posições)
│   ├── SINCRONIZAR_DEV_PROD.md
│   └── storage_setup.sql
│
├── 📁 types/
│   ├── database.types.ts
│   └── supabase.ts
│
├── 📁 node_modules/ (dependências)
│
├── .gitignore
├── eslint.config.mjs
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
│
└── 📄 Documentação Markdown (vários arquivos .md na raiz)
```

## 📋 Descrição das Pastas Principais

### `/app`
Diretório principal do Next.js App Router contendo:
- **`(auth)`**: Rotas de autenticação (login, onboarding)
- **`(main)`**: Rotas principais da aplicação
  - **`[workspaceSlug]`**: ✅ Rotas padronizadas por slug (único padrão oficial)
  - **`tasks`**: Componente compartilhado de tasks
  - Outras rotas: assistant, billing, finance, home, settings, team
- **`api`**: Rotas de API (AI, áudio, webhooks)
- **`auth`**: Callbacks de autenticação
- **`design-lab`**: Páginas de design/laboratório
- **`invite`**: Sistema de convites

### `/components`
Componentes React organizados por funcionalidade:
- **`assistant`**: Componentes de assistente IA
- **`finance`**: Componentes financeiros
- **`home`**: Componentes da página inicial
- **`layout`**: Componentes de layout (Header, Sidebar, etc.)
- **`tasks`**: Componentes relacionados a tarefas (25 arquivos)
- **`ui`**: Componentes de UI base (shadcn/ui - 24 arquivos)

### `/lib`
Bibliotecas e utilitários:
- **`actions`**: ✅ Server Actions centralizadas do Next.js
  - **`tasks.ts`**: ✅ Todas as ações de tarefas consolidadas
    - `updateTaskPosition()` - ✅ Exportada corretamente (versão principal com objeto de parâmetros)
      - Usa RPC `move_task` para contornar políticas RLS
      - Lida corretamente com retorno VOID/JSONB da RPC
      - Fallback automático para update direto se RPC não disponível
    - `updateTaskPositionsBulk()` - ✅ Bulk update via RPC `move_tasks_bulk`
      - Processamento atômico para melhor performance
      - Validação individual de permissões
    - `updateTaskPositionSimple()` - Versão de compatibilidade (deprecated)
    - `getWorkspaceIdBySlug()` - Resolve workspaceId a partir do slug
    - `getTasksForWorkspace()` - Busca tarefas filtradas por workspace
    - Outras funções: `getTasks()`, `createTask()`, `updateTask()`, `deleteTask()`, etc.
- **`config`**: Configurações
- **`supabase`**: Clientes e configurações do Supabase
- **`group-actions.ts`**: Ações relacionadas a grupos
- **`motion.ts`**: Configurações de animação
- **`utils.ts`**: Utilitários gerais

### `/hooks`
Custom hooks React:
- `use-file-upload.ts`: Upload de arquivos
- `use-task-cache.ts`: Cache de tarefas
- `use-task-preload.ts`: Pré-carregamento de tarefas
- `use-tasks.ts`: Gerenciamento de tarefas

### `/supabase`
Scripts e migrações do banco de dados:
- **`migrations`**: ✅ Migrações SQL padronizadas com timestamps `YYYYMMDDHHMMSS_nome.sql`
  - `20250101_create_move_task_rpc.sql`: Função RPC para atualização individual de posição
  - `20250101_create_move_tasks_bulk_rpc.sql`: Função RPC para bulk update de posições
- **Scripts de Manutenção**:
  - `SCRIPT_CORRIGIR_TIPO_POSICAO.sql`: Corrige tipo do parâmetro de INTEGER para DOUBLE PRECISION
  - `SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql`: Verifica e atualiza função move_task
  - `SCRIPT_VERIFICAR_POSICOES_SALVAS.sql`: Diagnóstico de posições no banco
  - `SCRIPT_REFRESH_TODAS_RPCS.sql`: Refresh completo do schema cache do PostgREST
  - `SCRIPT_TESTAR_MOVE_TASK.sql`: Teste direto da função RPC no banco
- Scripts de schema e validação

### `/types`
Definições TypeScript:
- `database.types.ts`: Tipos do banco de dados
- `supabase.ts`: Tipos do Supabase

### `/public`
Arquivos estáticos (imagens, ícones, SVGs)

### `/docs`
Documentação técnica do projeto

## 🔧 Arquivos de Configuração

- `package.json`: Dependências do projeto
- `tsconfig.json`: Configuração TypeScript
- `tailwind.config.ts`: Configuração Tailwind CSS
- `next.config.ts`: ✅ Configuração Next.js (único arquivo, duplicata removida)
- `eslint.config.mjs`: Configuração ESLint
- `vercel.json`: Configuração de deploy Vercel
- `components.json`: Configuração shadcn/ui

## ✅ Sistema de Drag & Drop e Persistência de Posição (v2.4)

### 1. Funções RPC no Banco de Dados
- **`move_task(UUID, DOUBLE PRECISION)`**: Atualiza posição individual
  - Retorna `JSONB` com `success`, `task_id`, `old_position`, `new_position`, `rows_affected`
  - Usa `SECURITY DEFINER` para contornar políticas RLS
  - Validação de permissões (workspace membership ou ownership)
  - Verificação pós-update usando `RETURNING` clause

- **`move_tasks_bulk(JSONB)`**: Atualiza múltiplas posições em lote
  - Recebe array de `{id, position}` via JSONB
  - Processamento atômico para melhor performance
  - Validação individual de permissões para cada tarefa

### 2. Algoritmo de Cálculo de Posição (Midpoint Calculation)
- **Estratégia**: Média entre vizinhos (floating point math)
  - Topo: `nextTask.position / 2`
  - Meio: `(prevTask.position + nextTask.position) / 2`
  - Final: `prevTask.position + 1000`
- **Vantagens**:
  - Evita colisões de posição
  - Permite inserções infinitas entre itens
  - Reduz drasticamente necessidade de re-indexação
  - Bulk update apenas em casos raros (espaço < 0.00001)

### 3. Scripts SQL de Manutenção
- `SCRIPT_CORRIGIR_TIPO_POSICAO.sql`: Corrige tipo INTEGER → DOUBLE PRECISION
- `SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql`: Verifica e atualiza função
- `SCRIPT_VERIFICAR_POSICOES_SALVAS.sql`: Diagnóstico de posições
- `SCRIPT_REFRESH_TODAS_RPCS.sql`: Refresh completo do schema cache

## ✅ Mudanças da Refatoração (Clean Architecture)

### 1. Unificação de Rotas
- ❌ **Removido**: `app/(main)/[workspaceId]` (rota duplicada)
- ✅ **Padrão oficial**: `app/(main)/[workspaceSlug]` (único padrão)

### 2. Limpeza de Arquivos
- ❌ **Removido**: Pasta `backup/` na raiz
- ❌ **Removidos**: Todos os arquivos `.minify.tsx` e `.backup.tsx`
- ❌ **Removidas**: Pastas `minify/` vazias

### 3. Centralização de Server Actions
- ✅ **Consolidado**: `actions/update-task-position.ts` → `lib/actions/tasks.ts`
- ✅ **Consolidado**: `lib/task-actions.ts` → `lib/actions/tasks.ts`
- ✅ **Removido**: Pasta `actions/` da raiz
- ✅ **Atualizados**: Todos os imports para usar `@/lib/actions/tasks`
- ✅ **Verificado**: `updateTaskPosition()` exportada corretamente em `lib/actions/tasks.ts`

### 4. Padronização de Migrations
- ✅ **Renomeados**: 9 arquivos SQL sem timestamp para padrão `YYYYMMDDHHMMSS_nome.sql`
- ✅ **Ordem cronológica**: Migrations organizadas por data de execução

### 5. Limpeza de Configuração
- ✅ **Removido**: `next.config.mjs` (duplicata)
- ✅ **Mantido**: `next.config.ts` como único arquivo de configuração do Next.js

## 📝 Notas

- O projeto utiliza Next.js 14+ com App Router
- TypeScript para tipagem
- Tailwind CSS para estilização
- Supabase como backend (banco de dados e autenticação)
- shadcn/ui para componentes de UI
- ✅ **Clean Architecture**: Estrutura padronizada e limpa após refatoração

---

*Última atualização: Após refatoração estrutural (Clean Architecture)*
