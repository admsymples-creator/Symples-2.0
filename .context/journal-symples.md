**# SYMPLES — Journal de Preview**

Este arquivo registra, em tempo quase real, o estado do ambiente de **preview** do Symples.
Cada entrada deve conter **data e hora** e ser organizada em três blocos:
melhorias/bugs/features entregues, trabalho em andamento e próximos passos imediatos.

---

## 2026-01-01 - Simplificação da Home Page e Correção de Visualização de Cards

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Simplificação da Home Page
- **Objetivo**: Remover barra de ações desnecessária e simplificar o layout
- **Mudanças Principais**:
  - Removida barra de ações (`HomeActionBar`) contendo botão "Criar tarefa" e tabs de período
  - Cards de tarefas e inbox agora aparecem diretamente abaixo do Trial Banner
  - Período das tarefas fixado em "week" (semana) por padrão
  - Layout mais limpo e focado no conteúdo principal

#### 🔧 Correção de Visualização de Cards
- **Problema**: Notificações e tarefas não apareciam nos cards apesar de serem renderizadas corretamente
- **Causa Raiz**: `ScrollArea` do Radix UI não funcionava corretamente dentro de containers flex com altura definida
- **Solução**: Substituído `ScrollArea` por `overflow-y-auto` diretamente nos containers
- **Resultado**: Notificações e tarefas agora aparecem corretamente com scroll funcional

#### 🧹 Limpeza de Instrumentação de Debug
- **Removido**: Todos os logs de debug adicionados durante investigação
  - Logs `fetch` para servidor de debug
  - `console.log` de debug em componentes
  - Regiões `#region agent log` e `#endregion`
- **Mantido**: Apenas `console.error` para erros em produção
- **Arquivos limpos**:
  - `components/home/HomeTasksSection.tsx`
  - `components/home/HomeInboxSection.tsx`
  - `lib/actions/tasks.ts`
  - `lib/actions/notifications.ts`

- **Arquivos modificados**:
  - `app/(main)/home/page.tsx`: Removido `HomeActionBarWrapper`, uso direto de `HomeTasksSection` e `HomeInboxSection`
  - `components/home/HomeTasksSection.tsx`: Substituído ScrollArea por overflow-y-auto, removidos logs de debug
  - `components/home/HomeInboxSection.tsx`: Substituído ScrollArea por overflow-y-auto, removidos logs de debug
  - `lib/actions/tasks.ts`: Removidos logs de debug
  - `lib/actions/notifications.ts`: Removidos logs de debug

### 2. O que está sendo trabalhado no momento

- Nenhum trabalho em andamento no momento

### 3. Próximos passos

- **Melhorias futuras**:
  - Considerar adicionar filtros de período de volta se necessário
  - Avaliar necessidade de botão criar tarefa na home ou manter apenas na página de tarefas

---

## 2025-01-31 - Refatoração Completa de Login e Signup com Autenticação por Senha

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Refatoração do Sistema de Autenticação
- **Objetivo**: Implementar login tradicional com email e senha, mantendo magic link apenas para login
- **Mudanças Principais**:
  - Login agora suporta 3 modos: senha, magic link e recuperação de senha
  - Signup agora exige senha obrigatória (magic link removido do signup)
  - Campo de nome completo adicionado no signup (opcional)
  - Layout reorganizado: botões sociais no topo, seguidos de separador e formulário

#### 🔐 Novas Server Actions (`lib/actions/auth.ts`)
- **`loginWithPassword()`**: Autenticação tradicional com email e senha
  - Suporta `inviteToken` para processar convites após login
  - Validação de email e senha
  - Redirect automático após login bem-sucedido
- **`signupWithPassword()`**: Criação de conta com email, senha e nome
  - Aceita `fullName` opcional (passado no metadata do Supabase)
  - Validação de senha (mínimo 6 caracteres)
  - Suporta `inviteToken` para aceitar convites automaticamente
- **`resetPassword()`**: Envio de email de recuperação de senha
  - Usa `supabase.auth.resetPasswordForEmail()`
  - Redirect para `/auth/callback?type=recovery`

#### 🎨 LoginForm Refatorado (`components/landing/LoginForm.tsx`)
- **Três Modos de Login**:
  - `password`: Login tradicional com email e senha (padrão)
  - `magic-link`: Login via magic link (alternativa)
  - `forgot-password`: Recuperação de senha
- **Layout Reorganizado**:
  1. Botão "Continuar com o Google" (topo)
  2. Botão "Entrar com magic link" (apenas no modo password)
  3. Separador "ou"
  4. Formulário (email + senha quando em modo password)
  5. Botão "Entre" (verde `bg-green-600`)
  6. Link "Esqueceu a senha?" (apenas no modo password)
  7. Link "Não tem uma conta? Criar uma conta"
- **Funcionalidades**:
  - Campo de senha com toggle mostrar/ocultar (ícone Eye/EyeOff)
  - Validação de email e senha
  - Estados de loading apropriados
  - Mensagens de erro claras
  - Suporte a `inviteToken` da URL
  - Acessibilidade: `aria-label` nos botões de mostrar/ocultar senha

#### 📝 SignupForm Refatorado (`components/landing/SignupForm.tsx`)
- **Mudanças Principais**:
  - Senha agora é **obrigatória** (removida opção de magic link)
  - Campo de nome completo adicionado (opcional)
  - Campo "Confirmar senha" sempre visível
  - Layout reorganizado: botão Google no topo, seguido de separador e formulário
- **Validações**:
  - Senha obrigatória
  - Senha mínimo 6 caracteres
  - Confirmação de senha deve coincidir
  - Validação de email
- **Funcionalidades**:
  - Campos de senha com toggle mostrar/ocultar
  - Mensagem de sucesso diferenciada (com/sem convite)
  - Suporte a `inviteToken` para aceitar convites automaticamente
  - Acessibilidade: `aria-label` nos botões de mostrar/ocultar senha

#### 🎯 Melhorias de UX e Acessibilidade
- **Consistência Visual**: Login e Signup agora seguem o mesmo padrão de layout
- **Acessibilidade**: 
  - `aria-label` adicionado em todos os botões de toggle de senha
  - Labels descritivos para leitores de tela
- **Feedback Visual**:
  - Mensagens de erro claras e específicas
  - Estados de loading apropriados para cada ação
  - Mensagens de sucesso diferenciadas por contexto

#### 🔧 Correções e Melhorias Técnicas
- **InviteToken no Login**: `loginWithPassword` agora aceita e passa `inviteToken` corretamente
- **Mensagens de Sucesso**: Melhoradas para indicar confirmação de email quando necessário
- **Tratamento de Erros**: Melhorado em todos os fluxos de autenticação
- **Validações**: Validação de email e senha tanto no cliente quanto no servidor

#### 📁 Arquivos Modificados
- `lib/actions/auth.ts`: 
  - Adicionadas `loginWithPassword()`, `signupWithPassword()`, `resetPassword()`
  - `loginWithPassword()` atualizado para suportar `inviteToken`
  - `signupWithPassword()` atualizado para aceitar `fullName` no metadata
- `components/landing/LoginForm.tsx`: 
  - Refatorado completamente com 3 modos de login
  - Layout reorganizado seguindo padrão da imagem de referência
  - Suporte a `inviteToken` da URL
- `components/landing/SignupForm.tsx`: 
  - Senha obrigatória, magic link removido
  - Campo de nome completo adicionado
  - Layout reorganizado para consistência com LoginForm

### 2. Trabalho em andamento
- Nenhum trabalho pendente relacionado a esta feature

### 3. Próximos passos imediatos
- Testes de integração em produção
- Validação de fluxos de convite com novo sistema de autenticação

---

## 2025-01-XX - Edição/Exclusão de Comentários, Links Clicáveis e Reordenação de Grupos

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Edição e Exclusão de Comentários com Optimistic UI
- **Funcionalidade**: Usuários podem editar e excluir seus próprios comentários no `TaskDetailModal`
- **Permissões**: Apenas o autor do comentário pode editar/excluir
- **Indicadores Visuais**: 
  - Comentários editados mostram "Editado" (similar ao WhatsApp)
  - Comentários removidos mostram "Removido" e o texto "Esta mensagem foi removida"
- **Optimistic UI**: Atualizações locais imediatas com rollback em caso de erro
- **Server Actions**:
  - `updateComment`: Atualiza comentário e adiciona `edited_at` no metadata
  - `deleteComment`: Marca comentário como deletado (soft delete) com `deleted_at` no metadata
- **Arquivos**:
  - `lib/actions/task-details.ts`: Novas funções `updateComment` e `deleteComment`
  - `components/tasks/TaskDetailModal.tsx`: Handlers `handleEditComment`, `handleSaveEditComment`, `handleCancelEditComment`, `handleDeleteComment`

#### 🔗 Links Clicáveis Automáticos na Descrição e Comentários
- **Funcionalidade**: URLs e links Markdown são automaticamente convertidos em links clicáveis azuis
- **Suporte**:
  - URLs automáticas: `https://`, `http://`, `www.`
  - Links Markdown: `[texto](url)`
- **Componentes**:
  - `lib/utils/link-parser.ts`: Função `parseLinks` para detectar URLs e links Markdown em texto
  - `lib/utils/linkify-html.ts`: Função `linkifyHtml` para processar HTML e converter URLs em links azuis
  - `components/ui/linkify-text.tsx`: Componente `LinkifyText` para renderizar texto com links clicáveis
- **Aplicação**:
  - Descrição da tarefa: Links processados no HTML do TipTap editor
  - Comentários: Links processados no texto dos comentários
- **Estilização**: Links azuis (`text-blue-600`) com hover underline

#### 🎨 Melhorias de UX na Descrição
- **Fade Overlay (Gradient Fade Mask)**: 
  - Gradiente da direita para esquerda aparece no hover da descrição
  - Evita que o botão "Editar" sobreponha o texto
  - Técnica: `bg-gradient-to-l from-white via-white via-60% to-transparent`
- **Botão Editar no Hover**: 
  - Botão "Editar" aparece apenas no hover da div da descrição
  - Removido hover da div (não é mais toda clicável)
  - Removido botão "Editar" do header da descrição
- **Links Apenas Clicáveis**: Apenas os links são clicáveis, não toda a descrição

#### 📋 Reordenação de Grupos de Tarefas (Melhorado)
- **Funcionalidade**: Usuários podem reordenar grupos de tarefas via submenu "Ordenar" no menu de ações
- **Interface**: 
  - Submenu "Ordenar" com 4 opções:
    - Mover para o topo (ArrowUpToLine)
    - Mover para cima (ArrowUp)
    - Mover para baixo (ArrowDown)
    - Mover para o final (ArrowDownToLine)
  - Opções desabilitadas automaticamente quando não aplicáveis (ex: "Mover para o topo" desabilitado se já estiver no topo)
- **Optimistic UI**: Reordenação local imediata com rollback em caso de erro
- **Múltiplas Chamadas**: Para "top" e "bottom", faz múltiplas chamadas sequenciais até chegar na posição desejada
- **Sincronização**: Ordem atualizada incrementalmente após cada chamada bem-sucedida
- **Persistência**: 
  - Ordem salva no banco de dados via `created_at` (múltiplas atualizações)
  - Ordem também salva no `localStorage` para evitar flicker no refresh
- **Cálculo de Posição**: Usa `groupOrder` (não `listGroups`) para calcular posições corretamente
- **Preservação de Ordem**: `loadGroups()` preserva ordem existente e só adiciona grupos novos ao final
- **Restrições**: 
  - Apenas funciona na visualização por grupos (`viewOption === "group"`)
  - Grupo "Inbox" não pode ser reordenado (sempre primeiro)
- **Arquivos**:
  - `lib/actions/task-groups.ts`: Função `reorderTaskGroup` (suporta "up" e "down")
  - `app/(main)/tasks/page.tsx`: 
    - Handler `handleReorderGroup` atualizado para suportar "top" e "bottom"
    - Cálculo de `canMoveToTop` e `canMoveToBottom` baseado em `groupOrder`
    - Preservação de ordem no `loadGroups()`
  - `components/tasks/GroupActionMenu.tsx`: 
    - Submenu "Ordenar" com 4 opções e ícones apropriados
    - Props `canMoveToTop` e `canMoveToBottom` para desabilitar opções
  - `components/tasks/TaskGroup.tsx`: 
    - Props `canMoveToTop` e `canMoveToBottom` passadas para o menu
    - Tipo de `onReorderGroup` atualizado para aceitar "top" e "bottom"

#### 🧹 Submenu Limpar Tarefas
- **Funcionalidade**: Usuários podem limpar tarefas de um grupo via submenu "Limpar" no menu de ações
- **Interface**: 
  - Submenu "Limpar" com 2 opções:
    - Todas as Tarefas (arquiva todas as tarefas do grupo)
    - Somente concluídas (arquiva apenas tarefas com status "done")
- **Modal de Confirmação**: 
  - Mostra quantidade exata de tarefas que serão arquivadas
  - Mensagens personalizadas baseadas no tipo de limpeza
  - Título e descrição dinâmicos
- **Filtragem**: 
  - Para "completed": filtra tarefas usando `t.completed === true` (não `t.status === "done"` pois status é o label da UI)
  - Para "all": arquiva todas as tarefas do grupo
- **Optimistic UI**: Remoção local imediata com rollback em caso de erro
- **Arquivos**:
  - `app/(main)/tasks/page.tsx`: 
    - Handler `handleClearGroup` atualizado para aceitar `type?: "all" | "completed"`
    - Filtragem correta de tarefas concluídas usando campo `completed`
  - `components/tasks/GroupActionMenu.tsx`: 
    - Submenu "Limpar" com 2 opções
    - Prop `tasks` adicionada para calcular quantidade de tarefas afetadas
    - Função `getTasksToClearCount` para calcular quantidade baseada no tipo
    - Modal de confirmação atualizado para mostrar quantidade de tarefas
  - `components/tasks/TaskGroup.tsx`: 
    - Prop `tasks` passada para o `GroupActionMenu`

#### 🐛 Correções
- **Correção**: Condição em `TaskGroup.tsx` não incluía `onReorderGroup`, impedindo menu de aparecer
- **Correção**: Ordem de definição de handlers em `TaskDetailModal.tsx` causava `ReferenceError`
- **Correção**: Links na descrição não ficavam azuis devido a conflito com estilos do prose
- **Correção**: `index` não definido no `.map()` de `listGroups` - adicionado parâmetro `index`
- **Correção**: `setListGroups` não existe - corrigido para usar `setGroupOrder` (que é o estado real)
- **Correção**: Cálculo de `canMoveToTop` e `canMoveToBottom` usando índice de `listGroups` em vez de `groupOrder`
- **Correção**: Flicker de 1 segundo no refresh - ordem agora preservada desde o início via `localStorage` e `loadGroups()` não sobrescreve ordem existente
- **Correção**: Grupo voltando para posição original após mover para topo/final - ordem agora atualizada incrementalmente após cada chamada bem-sucedida
- **Correção**: Filtragem de tarefas concluídas não funcionava - alterado de `t.status === "done"` para `t.completed === true` (status é o label da UI, não o valor do banco)
- **Correção**: Tipo de `isCurrentUser` em `TaskDetailModal.tsx` - alterado para retornar `boolean | undefined` em vez de `boolean | "" | null`
- **Correção**: Tipos implícitos `any` em callbacks de `linkify-html.ts` - adicionados tipos explícitos aos parâmetros

---

## 2025-12-14 - Refinamento do Tutorial Interativo e Correção de Crash

### 1. Melhorias, bugs e features implementadas em preview

#### 🐛 Correção: Crash no HomePage (Server Component)
- **Problema**: Acesso direto a `searchParams` em componente assíncrono do servidor no Next.js 15+ causava crash em runtime.
- **Solução**: Removida lógica de visualização do servidor. O `HomePage` agora é puramente leitura de dados, delegando a responsabilidade de UI para componentes clientes.
- **Arquivo**: `app/(main)/home/page.tsx`

#### 🎨 Melhoria: Highlight do Workspace Card (Client-Side)
- **Mudança**: Migração da lógica de destaque "Tutorial" para o próprio componente `WorkspaceCard`.
- **Como Funciona**: O card usa o hook `useSearchParams` para detectar `?tutorial=true`.
- **Inteligência**: Se nenhum ID for passado, o primeiro card da lista assume o destaque automaticamente via prop `isFirst`.
- **Resultado**: Interação instantânea sem depender de hidratação ou dados do servidor.

#### 🔧 Correção: Sidebar Limpa
- **Fix**: Removido código legado que mantinha um destaque visual (glow) indesejado no seletor de workspaces da Sidebar.

---

## 2025-12-13 - Correção: Zero State do Tutorial

### 1. Melhorias, bugs e features implementadas em preview

#### 🐛 Correção: Inconsistência no Zero State (Tutorial)
- **Problema**: O "Zero State" (tela ilustrativa quando não há tarefas) às vezes não aparecia imediatamente após fechar o modal de boas-vindas na primeira visita.
- **Causa**: O estado de visualização do tutorial era lido apenas na montagem inicial do componente, não reagindo ao fechamento do modal.
- **Solução**:
  - `HomePageClient.tsx`: O estado `welcomeSeen` foi elevado para este componente pai.
  - Sincronização: O estado agora é atualizado imediatamente ao fechar o modal.
  - `WeeklyViewWrapper`: Passou a receber `welcomeSeen` via props, garantindo re-renderização reativa.
- **Resultado**: A transição do Modal para o Zero State agora é instantânea e garantida.

---

## 2025-12-13 - Correção: Redirect de Convite (Race Condition)

### 1. Melhorias, bugs e features implementadas em preview

#### 🐛 Correção: Race Condition no Aceite Manual de Convite
- **Problema**: Usuários logados que aceitavam convites eram redirecionados para `/home`. Devido à latência do banco de dados (replica lag), a query `getUserWorkspaces` na Home às vezes retornava vazio, lançando o usuário para o Onboarding indevidamente.
- **Solução**:
  - `lib/actions/members.ts`: Atualizado `acceptInvite` para retornar também o `workspaceSlug`.
  - `app/invite/[token]/page.tsx`: Atualizado `handleAccept` para redirecionar diretamente para `/[slug]/tasks`.
- **Benefício**:
  - Elimina a race condition (não depende mais de `getUserWorkspaces` na Home).
  - Melhora a UX levando o usuário direto para o contexto do trabalho.

---

## 2025-12-13 - Landing Page Mobile-First & Branding V2

### 1. Melhorias, bugs e features implementadas em preview

#### 🚀 Nova Landing Page (Mobile-First Business OS)
- **Conceito**: "Gerir uma empresa tem que ser Symples".
- **Design Strategy**: Mobile-First, com mocks flutuantes de alta fidelidade e visual "Apple-like".
- **Componentes de Mocks (`components/ui-mocks/`)**:
  - `MockMobileFrame`: Container smartphone reutilizável.
  - `MockChatInterface`: Interface estilo WhatsApp Business com visualização de áudio.
  - `MockAIAssistant`: Interface de IA com gráficos CSS-only.
  - `MockKanbanCard`: Cards de tarefa compactos e densos.
  - `MockComparison`: Tabela glassmorphism comparando "Tradicional vs Symples".
- **Seções Implementadas (`components/landing-page/`)**:
  - `HeroSection`: Animações Framer Motion, "cérebro" IA centralizado.
  - `FeatureTabs`: Abas interativas (Input -> Processamento -> Gestão).
  - `BentoGrid`: Grid estilo Apple Bento com casos de uso (Segundo Cérebro, Financeiro).
  - `PricingFAQ`: Planos e dúvidas frequentes.
- **Página Principal**:
  - Nova montagem em `app/page.tsx` integrando todas as seções.
  - Footer minimalista "Symples Tecnologia 2025".

### 2. Trabalho em andamento
- Refinamento de performance das animações.
- Testes de responsividade em dispositivos reais.

---

## 2025-01-XX - Correção: Comentário Otimista Desaparecendo Tardio em TaskDetailModal

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Correção: Comentário Otimista Desaparecendo 1 Segundo Após o Real
- **Problema**: O comentário otimista permanecia visível por ~1 segundo após o comentário real ser carregado do servidor, causando duplicação visual temporária
- **Causa Raiz**: O `useOptimistic` mantinha o comentário otimista mesmo após atualizar o estado base, porque a remoção não era feita de forma síncrona antes do recarregamento
- **Solução Implementada**: Remoção síncrona do comentário otimista do estado base antes de recarregar atividades do servidor

#### 🔧 TaskDetailModal.tsx - Correções Implementadas
- **`reloadActivities`**: Filtra comentário otimista pendente antes de atualizar estado base
  - Verifica `optimisticIdRef.current` antes de atualizar
  - Filtra atividades carregadas do servidor para excluir o ID otimista
  - Limpa `optimisticIdRef.current` após atualização
- **`handleSendComment`**: Remove comentário otimista do estado base antes de recarregar
  - Remove do estado base de forma síncrona usando `setActivities(prev => prev.filter(...))`
  - Limpa `optimisticIdRef.current` imediatamente
  - Depois recarrega atividades do servidor (que já filtra o otimista como redundância)
- **Resultado**: Comentário otimista desaparece instantaneamente quando o comentário real é carregado, sem delay de 1 segundo

#### 📝 Detalhes Técnicos
- **Hook `useOptimistic`**: Mantém estado otimista separado do estado base
- **Sincronização**: Remoção síncrona do estado base garante que `useOptimistic` atualize imediatamente
- **Redundância**: `reloadActivities` também filtra o otimista para garantir que não haja duplicação mesmo se a remoção anterior falhar
- **Commit**: `db6e542` - "fix: corrigir desaparecimento tardio do comentário otimista em TaskDetailModal"

---

## 2025-01-09 - Correção Crítica: Fluxo de Convites em Produção (Hardening de Cookies e URL Redundancy)

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Correção Crítica: Fluxo de Convites Funcionando em Produção
- **Problema**: Fluxo de convites funcionava localmente mas falhava em produção (Vercel)
  - **Sintoma 1**: Novos usuários eram redirecionados para onboarding ao invés do workspace convidado
  - **Sintoma 2**: Usuários existentes eram redirecionados para workspace antigo, ignorando novo convite
  - **Causa Raiz**: Cookie `pending_invite` sendo bloqueado ou perdido durante redirects OAuth em produção devido a políticas de `Secure` e `SameSite` não configuradas corretamente
- **Solução Implementada**: Hardening completo do fluxo com redundância URL + Cookie

#### 🔒 Task 1: Hardening do Middleware (Cookie Logic)
- **`middleware.ts`**: Configurações explícitas e robustas para produção
  - `secure: process.env.NODE_ENV === 'production'` - ✅ HTTPS only em produção (REQUERIDO)
  - `sameSite: 'lax'` - ✅ CRÍTICO: Permite cookie ser lido após OAuth redirect
  - `httpOnly: false` - Permite leitura no client se necessário
  - `path: '/'` - Disponível em todas as rotas
  - `maxAge: 3600` - 1 hora de validade
  - Logs melhorados para debug em produção
- **Resultado**: Cookie agora funciona corretamente em ambiente HTTPS com redirects OAuth

#### 🔗 Task 2: URL Redundancy (The "Unbreakable Link")
- **`app/invite/[token]/page.tsx`**: Passa invite token na URL além do cookie
  - Links de login/signup agora incluem `?invite=${inviteId}` na URL
  - Redundância: Cookie (middleware) + URL (parâmetro) garante que token sobreviva mesmo se cookie falhar
  - Links atualizados:
    - `/signup?invite=${inviteId}` (já tinha, mantido)
    - `/login?next=/invite/${inviteId}&invite=${inviteId}` (novo - adicionado parâmetro invite)
- **`components/landing/LoginForm.tsx`**: Suporte completo a invite token
  - Lê invite token da URL via `useSearchParams`
  - Passa token para `signInWithGoogle()` que inclui na URL do OAuth
- **`components/landing/SignupForm.tsx`**: Já estava passando token corretamente
- **Resultado**: Token agora persiste mesmo se cookie for bloqueado por políticas de segurança

#### 🎯 Task 3: Auth Callback com Prioridade Correta
- **`app/auth/callback/route.ts`**: Prioridade URL → Cookie → Processamento
  - **1. PRIORIDADE**: Parâmetro `invite` na URL (mais confiável, funciona sempre)
  - **2. FALLBACK**: Cookie `pending_invite` (backup se URL não tiver)
  - **3. PROCESSAMENTO**: Aceita convite imediatamente após autenticação
  - **4. REDIRECIONAMENTO**: Redireciona para workspace específico `/${workspaceSlug}/tasks?invite_accepted=true`
- **Melhorias de Redirecionamento**:
  - Busca slug do workspace aceito para redirecionar diretamente
  - Redireciona para `/${workspaceSlug}/tasks` ao invés de `/home` genérico
  - Fallback para `/home?invite_accepted=true` se workspace não encontrado
  - Retry logic com delay maior (1000ms) para garantir que workspace_members foi criado
- **Logs Detalhados**: Logs melhorados para debug em produção mostrando origem do token (URL vs Cookie)
- **Resultado**: Usuários agora são redirecionados corretamente para o workspace convidado, não para onboarding ou workspace antigo

#### 🔧 Por Que Funciona Agora em Produção
1. **Cookie Seguro**: `secure: true` é obrigatório em HTTPS (produção)
2. **SameSite Lax**: Permite cookie ser lido após redirects OAuth (crítico para Google OAuth)
3. **Redundância URL + Cookie**: Se cookie falhar, URL ainda funciona
4. **Prioridade Correta**: URL primeiro (mais confiável), cookie como fallback
5. **Redirecionamento Direto**: Vai para workspace específico, não `/home` genérico

#### 📝 Arquivos Modificados
- `middleware.ts`: Hardening de cookie com configurações explícitas
- `app/invite/[token]/page.tsx`: Adicionado parâmetro `invite` na URL dos links
- `app/auth/callback/route.ts`: Prioridade URL → Cookie, redirecionamento para workspace específico
- `components/landing/LoginForm.tsx`: Suporte a invite token da URL

### 2. Trabalho em andamento
- ✅ **Correções concluídas e prontas para teste em produção**

### 3. Próximos passos imediatos
- ⏳ Testar fluxo completo em produção (Vercel)
- ⏳ Validar que novos usuários são redirecionados corretamente para workspace convidado
- ⏳ Validar que usuários existentes são redirecionados para novo workspace, não workspace antigo
- ⏳ Monitorar logs em produção para confirmar que tokens estão sendo lidos corretamente (URL vs Cookie)

---

## 2025-01-08 - Correção Crítica: Onboarding para Usuários Convidados e Next.js 15+

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Correção Crítica: Onboarding Aparecendo para Usuários Convidados
- **Problema**: Usuários convidados (que aceitaram convite) ainda estavam vendo o onboarding modal em preview e produção
- **Causa Raiz**: 
  - O `WELCOME_SEEN_KEY` não era setado quando um convite era aceito
  - O hook `useShouldShowOnboarding` não verificava se um convite havia sido aceito
- **Solução Implementada**:
  - **`components/home/HomePageClient.tsx`**: Quando detecta `invite_accepted=true` na URL ou cookie `newly_accepted_workspace_id`, seta `WELCOME_SEEN_KEY` como `'true'` imediatamente
  - **`components/home/OnboardingModal.tsx`**: Hook `useShouldShowOnboarding` agora aceita parâmetro `inviteAccepted` e verifica cookie `newly_accepted_workspace_id` - se qualquer um existir, retorna `false` imediatamente
- **Lógica Final**:
  - Se `invite_accepted=true` na URL → não mostrar onboarding
  - Se cookie `newly_accepted_workspace_id` existe → não mostrar onboarding
  - Se usuário tem workspaces → não mostrar onboarding
  - Só mostra onboarding para novos usuários que criaram seu próprio workspace e não têm tarefas
- **Resultado**: Usuários convidados nunca veem o onboarding modal, mesmo que seja a primeira vez que acessam o app

#### ✅ Correção: Next.js 15+ searchParams como Promise
- **Problema**: Erro de source map e acesso direto a `searchParams` sem `await` em `app/(auth)/signup/page.tsx`
- **Causa**: No Next.js 15+, `searchParams` é uma Promise e requer `await`
- **Solução**: 
  - Alterado tipo de `searchParams: { invite?: string }` para `searchParams: Promise<{ invite?: string }>`
  - Adicionado `await` antes de acessar: `const resolvedSearchParams = await searchParams;`
- **Arquivo**: `app/(auth)/signup/page.tsx`
- **Resultado**: Página de signup funciona corretamente com Next.js 15+

---

## 2025-01-08 - Correções de UX e Bugs Críticos

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Correção: Zero State da Visão Semanal não Aparecia na Primeira Entrada
- **Problema**: Ao entrar pela primeira vez no app, o zero state não aparecia imediatamente, somente após refresh
- **Causa**: O `showPlaceholder` era inicializado como `false` e só era atualizado no `useEffect` após a montagem do componente
- **Solução**: Inicialização do estado `showPlaceholder` com função que verifica o `localStorage` imediatamente na primeira renderização
- **Arquivo**: `components/home/WeeklyViewWrapper.tsx`
- **Resultado**: Zero state aparece imediatamente na primeira renderização quando o modal de onboarding já foi visto

#### ✅ Correção: Link de Convite não Aparecia em Produção
- **Problema**: Ao enviar um convite, a opção de copiar o link não aparecia em produção
- **Causa**: O `inviteLink` só era retornado quando `NODE_ENV === "development"`
- **Solução**: Sempre retornar o `inviteLink` na função `inviteMember`, independente do ambiente
- **Arquivos**: 
  - `lib/actions/members.ts` - Sempre retorna `inviteLink`
  - `app/(main)/settings/settings-client.tsx` - Mensagem atualizada para "Copie o link abaixo para compartilhar:"
- **Resultado**: Link de convite e botão de copiar aparecem sempre, em desenvolvimento e produção

#### ✅ Correção: Onboarding Aparecendo Após Login com Google para Membros Existentes
- **Problema**: Quando um membro existente (com workspaces) aceitava um novo convite e fazia login com Google, o onboarding aparecia novamente
- **Causa**: O código removia o `WELCOME_SEEN_KEY` do localStorage sempre que um convite era aceito, mesmo para usuários que já tinham workspaces
- **Solução**: Adicionar verificação para só remover `WELCOME_SEEN_KEY` se o usuário não tiver workspaces (novo usuário)
- **Arquivo**: `components/home/HomePageClient.tsx`
- **Resultado**: Onboarding só aparece novamente para novos usuários (sem workspaces), não para membros existentes que aceitam novos convites

#### ✅ Melhoria: Zero State da Visão Semanal com Skeletons e Botão Atualizado
- **Botão Atualizado**: Texto alterado de "Adicionar tarefa rápida" para "Começar agora"
- **Skeletons Adicionados**: Cada uma das 5 colunas do grid agora tem skeletons no fundo simulando cards de tarefas
- **Visual**: Skeletons com animação `animate-pulse` e cores suaves (`bg-slate-200/60`)
- **Arquivo**: `components/home/EmptyWeekState.tsx`
- **Resultado**: Zero state mais informativo e visualmente mais rico, dando prévia de como ficaria a visão semanal com tarefas

#### 🔧 Correções Técnicas
- **Array de Dependências do useEffect**: Corrigido erro de tamanho variável no array de dependências usando valor primitivo estável (`workspacesLength`)
- **Estabilidade de Dependências**: Extraído `workspaces.length` para variável primitiva antes do `useEffect` para garantir tamanho constante do array

---

## 2025-12-06 - Sistema de Notificações Unificado (Universal Inbox) - Finalizado

### 1. Melhorias, bugs e features implementadas em preview

#### 🔔 Sistema de Notificações Completo
- **Tabela de Notificações**:
  - Tabela `notifications` criada com suporte a categorização semântica
  - Campos: `recipient_id`, `triggering_user_id`, `category`, `resource_type`, `resource_id`, `title`, `content`, `action_url`, `metadata`
  - Índices otimizados para queries de "não lidas" e ordenação por data
  - Realtime habilitado para notificações em tempo real
  - RLS policies configuradas para segurança
- **Tipos TypeScript**:
  - `NotificationCategory`: 'operational' | 'admin' | 'system'
  - `NotificationMetadata`: Interface rica com campos para visualização (icon, color, bg) e contexto (actor_name, file_type, task_title, etc.)
- **Server Actions** (`lib/actions/notifications.ts`):
  - `getNotifications()`: Busca notificações com filtros por categoria e status de leitura
  - `markAsRead()`: Marca uma notificação como lida
  - `markAllAsRead()`: Marca todas como lidas
  - `createNotification()`: Utilitário para criar notificações programaticamente
  - `getUnreadCount()`: Conta notificações não lidas
- **Componentes UI**:
  - `NotificationItem`: Card individual com lógica inteligente de ícones
    - Prioridade para áudio (ícone Mic, cor roxa)
    - Detecção automática de tipo de arquivo (image, pdf, audio, document)
    - Ícones contextuais por categoria (ShieldAlert para admin, PartyPopper para novos membros, etc.)
    - Formatação de datas com `date-fns` e locale ptBR
  - `NotificationsPopover`: Popover completo com abas
    - Aba "Todas": Lista geral mixada
    - Aba "Admin": Apenas para owners/admins, filtra por category = 'admin'
    - Aba "Não Lidas": Filtro rápido de não lidas
    - Integração com Supabase Realtime para notificações instantâneas
    - Empty state gamificado: "Tudo limpo! Você está em dia." quando não há notificações
    - Optimistic UI com rollback em caso de erro
- **Triggers Automáticos**:
  - `trigger_notify_task_comment`: Notifica quando comentário é criado
    - Detecta automaticamente se é áudio (prioridade visual roxa)
    - Notifica criador da tarefa e responsável (exceto autor)
  - `trigger_notify_task_attachment`: Notifica quando arquivo é anexado
    - Prioridade visual para áudios (roxo), imagens (azul), PDFs (vermelho)
    - Notifica criador e responsável (exceto uploader)
  - `trigger_notify_task_assignment`: Notifica quando tarefa é atribuída
    - Notifica o novo responsável
  - `trigger_notify_workspace_invite`: Notifica quando convite é criado
    - Complementa o email de convite
    - Notifica apenas se usuário já tem conta
  - `check_overdue_tasks()`: Função para tarefas atrasadas (chamada por cron)
    - Evita spam (não notifica mais de uma vez por dia)
    - Calcula dias de atraso automaticamente

#### 🎨 UX e Design
- **Lógica de Ícones Inteligente**:
  - Prioridade 1: Anexos (especialmente áudio - roxo)
  - Prioridade 2: Admin/Segurança (ShieldAlert - vermelho)
  - Prioridade 3: Operacional (UserPlus, MessageSquare, CheckCircle2)
  - Fallback: AlertCircle para sistema
- **Estados Visuais**:
  - Não lido: Fundo `bg-slate-50` + dot azul à direita
  - Lido: Fundo branco/transparente
  - Hover effects suaves
- **Integração com Header**:
  - Badge de contador de não lidas no ícone Bell
  - Popover alinhado à direita
  - Suporte a `userRole` para mostrar aba Admin apenas para admins

#### 🔧 Correções Técnicas
- **Migração SQL**:
  - Ordem correta de parâmetros na função `create_notification()` (obrigatórios primeiro, opcionais depois)
  - Todas as chamadas atualizadas para usar ordem correta
  - Funções com `SECURITY DEFINER` para permissão de criar notificações
  - Tratamento de erros gracioso (não quebra operações principais)
- **Performance**:
  - Índices otimizados para queries frequentes
  - Queries com relacionamentos otimizados (busca de profiles separada)
  - Realtime configurado corretamente com unsubscribe no cleanup

#### 📚 Documentação
- **Guia Completo** (`docs/NOTIFICACOES_SETUP.md`):
  - Instruções de configuração passo a passo
  - Como configurar cron job para tarefas atrasadas
  - Testes e troubleshooting
  - Exemplos de queries SQL para monitoramento
- **Guia de Execução** (`docs/NOTIFICACOES_EXECUCAO.md`):
  - Passo a passo para ativar em produção
  - Queries de verificação
  - Checklist completo

#### 🎨 Refinamentos Finais
- **Scroll Suave e Limpo**:
  - Scrollbar fina (6px) com visual discreto
  - Scroll suave (`scroll-smooth`) para melhor UX
  - Suporte touch para iOS (`-webkit-overflow-scrolling: touch`)
  - Scrollbar cinza sutil que escurece no hover
- **Alinhamento de Abas**:
  - Abas alinhadas à esquerda com mesmo padding do título
  - Visual mais organizado e consistente
- **Dados Mock**:
  - Sistema de dados mock implementado para visualização do design
  - 10 notificações de exemplo cobrindo todos os tipos
  - Desativado por padrão (pronto para produção)
- **Função de Teste**:
  - `createTestNotifications()` criada para testes manuais
  - Cria 5 notificações de teste automaticamente
  - Útil para testar sem precisar de outra conta
- **Limpeza de Código**:
  - Todos os logs de debug removidos
  - Código limpo e pronto para produção
  - Apenas `console.error` mantido para erros reais

### 2. Trabalho em andamento
- Nenhum no momento

### 3. Próximos passos imediatos
- ✅ Executar migrações SQL no Supabase (produção)
- ⏳ Configurar cron job para tarefas atrasadas (pg_cron ou n8n)
- ⏳ Testar triggers manualmente em ambiente de preview
- ⏳ Monitorar criação de notificações em produção
- (Opcional) Adicionar mais triggers para outros eventos (mudança de status, conclusão de tarefa)

---

## 2025-01-XX - Redesign Completo do DayColumn

### 1. Melhorias, bugs e features implementadas em preview

#### 🎨 Redesign Visual do DayColumn
- **Layout Refinado**:
  - Altura dinâmica (`min-h-[500px] max-h-[80vh]`) ao invés de fixa
  - Gradiente sutil para dia atual: `bg-gradient-to-b from-green-50/60 to-white`
  - Bordas mais sutis: `border-[1.5px] border-green-200/80` para hoje
  - Hover effects em dias inativos com transições suaves
  - Border radius aumentado: `rounded-2xl` para visual mais moderno
- **Header Aprimorado**:
  - Nome do dia em uppercase com tracking-wider e font-bold
  - Badge de contador de tarefas pendentes no canto superior direito
  - Cores dinâmicas: verde para hoje (`text-green-700`), cinza para outros dias
  - Data em destaque com `text-lg font-semibold`
  - Border inferior que aparece no hover para dias inativos
- **Quick Add Redesenhado**:
  - Input area com design card-like: `rounded-xl border shadow-sm`
  - Textarea com auto-resize inteligente (máximo 120px)
  - Ícone Plus que transforma em ponto verde pulsante quando focado
  - Toolbar inferior que aparece condicionalmente (focado ou com texto):
    - Botão customizado do TaskDateTimePicker com estado visual claro
    - Dica "ENTER para salvar" no canto direito
    - Background sutil (`bg-gray-50/50`) para separação visual
  - Blur effect no topo do footer para conteúdo scrollando por trás
  - Estados visuais aprimorados: ring verde (`ring-4 ring-green-500/10`) e shadow quando focado
  - Transform no focus: `transform -translate-y-1` para feedback tátil
  - Tutorial highlight com animação pulse quando `highlightInput` está ativo
- **Empty State Refinado**:
  - Aparece apenas no hover do container (`opacity-0 group-hover/column:opacity-100`)
  - Design minimalista com ícone FolderOpen em círculo cinza
  - Texto "Tudo limpo" com subtítulo explicativo
  - Transição suave de opacidade
- **Performance**:
  - Ordenação de tarefas memoizada com `useMemo` para evitar recálculos
  - Contador de pendências memoizado
  - Handlers simplificados e otimizados
- **UX Melhorias**:
  - Toast notifications para erros (via `sonner`)
  - Rollback automático do input em caso de erro na criação
  - Espaço extra no final do scroll (`h-16`) para não bater no input
  - Auto-resize do textarea para melhor experiência de digitação
  - Feedback visual imediato em todas as interações

#### 🔧 Correções Técnicas
- **Importações Otimizadas**:
  - Adicionado `useMemo` do React para performance
  - Adicionado `toast` do `sonner` para notificações
  - Ícones adicionais: `Plus`, `Calendar as CalendarIcon`
- **Código Limpo**:
  - Handlers simplificados e mais diretos
  - Remoção de código redundante
  - Melhor organização de estados e efeitos

---

## 2025-12-06 - Reposicionamento de Indicadores e Reset de Filtro ao Mover Tarefa

### 1. Melhorias, bugs e features implementadas em preview

#### 📍 Reposicionamento de Indicadores Focus e Urgente
- **Indicadores Movidos para Coluna da Data**:
  - Focus (Zap) e Urgente (AlertTriangle) agora aparecem na coluna da Data (lado esquerdo)
  - Removidos da seção de hover do título
  - Comentários permanecem na seção de hover do título
- **Visibilidade Inteligente**:
  - Quando ativos: sempre visíveis (`opacity-100`) com cores destacadas
  - Quando inativos: aparecem apenas no hover (`opacity-0 group-hover:opacity-100`)
  - Layout flexível com gap adequado na coluna da Data
- **Benefícios**:
  - Indicadores relacionados a data/prioridade agrupados logicamente
  - Sempre visíveis quando ativos (melhor feedback visual)
  - Interface mais limpa (menos elementos no hover do título)

#### 🔄 Reset Automático de Filtro de Ordenação ao Mover Tarefa
- **Comportamento Implementado**:
  - Ao mover tarefa via drag & drop, o filtro `sortBy` é resetado automaticamente para `"position"`
  - URL atualizada automaticamente (remove parâmetro `sort`)
  - Interface reflete a mudança (botão de ordenação volta a "Nada aplicado")
- **Casos de Uso Cobertos**:
  - Movimento normal (caso padrão - 99% das vezes)
  - Movimento com rebalanceamento (quando espaço entre posições fica pequeno)
  - Funciona em ambos os casos após salvar com sucesso
- **Lógica de Reset**:
  - Verifica se `sortBy !== "position"` antes de resetar
  - Usa `usePathname` para atualizar URL corretamente
  - Mantém sincronização entre estado, URL e interface
- **Benefícios UX**:
  - Ordem manual sempre respeitada após mover tarefa
  - Não há conflito entre ordenação automática e manual
  - Feedback claro: usuário sabe que está em modo de ordenação manual
  - Consistência: comportamento previsível e intuitivo

## 2025-12-06 - Ghost Group para Criação Rápida de Grupo

### 1. Melhorias, bugs e features implementadas em preview

#### 👻 Ghost Group para Criação Rápida de Grupo
- **Componente GhostGroup Criado**:
  - Placeholder visual após o último grupo para incentivar criação de novas seções
  - Design compacto em estilo botão horizontal (barra)
  - Bordas tracejadas com hover effects suaves
  - Ícone Plus centralizado com estados de hover
  - Label customizável (padrão: "Novo Grupo")
- **Integração na Página de Tarefas**:
  - Renderizado após o último grupo na lista
  - Visível apenas quando `viewOption === "group"`
  - Funciona dentro e fora do `SortableContext`
  - Ao clicar, abre modal de criação de grupo (`setIsCreateGroupModalOpen`)
- **Refinamento Visual**:
  - Altura fixa `h-24` para melhor presença visual
  - Ícone maior (w-8 h-8) com container arredondado e sombra
  - Texto em uppercase com tracking-wide para destaque
  - Background sutil (`bg-gray-50/30`) visível por padrão
  - Espaçamento melhorado (`mt-6 mb-2`)
  - Border radius `rounded-xl` para consistência visual
- **Comportamento de Posicionamento**:
  - Props customizáveis: `label` (padrão: "Novo Grupo") e `className`
  - Novo grupo criado aparece no final da lista de grupos (após todos os grupos existentes)
  - Ordem gerenciada pelo `groupOrder` state e localStorage
- **Design e UX**:
  - Estilo minimalista e discreto (bordas tracejadas, background transparente)
  - Hover effects: borda verde, background sutil, sombra leve
  - Feedback tátil: `active:scale-[0.99]` para pressão
  - Acessibilidade: `aria-label` e `focus-visible` com ring verde
  - Transições suaves em todos os estados
- **Benefícios**:
  - Incentiva criação de grupos (affordance visual clara)
  - Mantém interface limpa e não intrusiva
  - Alinhado com padrão de "ghost slots" do design system
  - Facilita organização e crescimento do workspace

## 2025-12-06 - Altura Dinâmica dos Grupos (Hug Contents)

### 1. Melhorias, bugs e features implementadas em preview

#### 📐 Altura Dinâmica dos Grupos (Hug Contents)
- **Problema**: Container do grupo tinha altura fixa (`min-h-[200px]`), causando espaços em branco excessivos quando havia poucas tarefas
- **Solução Implementada**:
  - Substituído altura fixa por `h-fit` para abraçar o conteúdo dinamicamente
  - Grupos normais: `h-fit min-h-[100px]` (altura mínima reduzida de 200px para 100px)
  - Inbox: `h-fit min-h-[60px]` (mantido compacto)
  - Container cresce/shrink conforme quantidade de tarefas
- **Benefícios**:
  - Sem espaços em branco desnecessários
  - Layout mais limpo e eficiente
  - Área de drop ainda funcional com `min-h` mínimo
  - Melhor aproveitamento do espaço vertical

## 2025-12-06 - Empty State Compacto do Inbox

### 1. Melhorias, bugs e features implementadas em preview

#### 📦 Empty State Compacto do Inbox
- **Altura Reduzida do Container**:
  - Container do Inbox: `min-h-[60px]` (era `min-h-[200px]`)
  - Redução de 70% na altura mínima
  - Outros grupos mantêm `min-h-[200px]` (comportamento original)
  - Detecção automática do grupo Inbox via `id === "inbox" || id === "Inbox"`

- **Empty State Específico para Inbox**:
  - Input sempre visível (QuickTaskAdd com variante `ghost`)
  - Altura ultra-compacta: ~48px total (padding `py-1` + input `h-10`)
  - Placeholder específico: "Digite para adicionar tarefa ao Inbox..."
  - Sem necessidade de clicar em botão para iniciar criação
  - Reutilização do componente `TaskGroupEmpty` com variante `inbox`

- **Reutilização de Componentes**:
  - `TaskGroupEmpty` estendido com suporte a variante `inbox` e slot customizado
  - Variante `default`: mantém comportamento original (botão + texto)
  - Variante `inbox`: renderiza children diretamente com padding mínimo
  - Consistência de design e código reutilizável

- **Boas Práticas de UX para Inbox**:
  - Foco em captura rápida de tarefas
  - Menos elementos visuais decorativos
  - Input sempre acessível para digitação imediata
  - Mensagem contextual e direta
  - Espaçamento mínimo mas funcional

## 2025-12-06 - Navegação Rápida via Teclado e Posicionamento de Tarefas

### 1. Melhorias, bugs e features implementadas em preview

#### ⌨️ Navegação Rápida via Teclado (Enter)
- **Foco Imediato Após Criação**:
  - Usa `requestAnimationFrame` para garantir que DOM atualizou antes de focar
  - Foco imediato após limpar input (não espera Promise resolver)
  - Permite criação rápida e contínua sem interrupção
  - Input sempre pronto para próxima digitação

- **Estado isCreatingSingle para Feedback Visual**:
  - Novo estado para rastrear criação única (diferente de batch)
  - Spinner visível durante criação única e batch
  - Feedback visual discreto e claro sem bloquear input

- **Input Não Bloqueado Durante Criação Única**:
  - Input permanece habilitado durante criação única
  - Permite digitação contínua sem interrupção
  - Apenas batch desabilita input (necessário para controle)
  - Criação em background não bloqueia UI

- **Preservação de Contexto Entre Criações**:
  - Data e assignee preservados entre criações
  - Facilita criar múltiplas tarefas com mesmo contexto
  - Escape limpa contexto apenas quando input vazio
  - Comportamento inteligente: Escape com texto limpa só texto, sem contexto

- **Comportamento do Escape Melhorado**:
  - Input vazio: limpa contexto (data/assignee) e cancela
  - Input com texto: limpa apenas o texto, mantém contexto
  - Remove foco do input após Escape
  - UX intuitiva e previsível

- **Criação em Background**:
  - Criação única não espera Promise resolver
  - Permite criação rápida e contínua
  - Erros tratados em background sem bloquear
  - Toast de erro aparece sem interromper fluxo

#### 📍 Posicionamento de Tarefas Recém-Criadas
- **Seguir Ordem Existente (Adicionar no Final)**:
  - Tarefas adicionadas no final da lista, respeitando ordenação
  - Quando `sortBy === "position"`: calcula última posição e adiciona no final
  - Quando outras ordenações: adiciona no final (ordenação reaplicada automaticamente)
  - Considera grupo quando `viewOption === "group"` (calcula posição dentro do grupo)
- **Benefícios**:
  - Mantém consistência com ordenação existente
  - Permite criação rápida sem quebrar fluxo visual
  - QuickTaskAdd está no final, tarefa aparece logo acima dele
  - Respeita sistema de drag & drop (position)
  - Alinhado com padrões de apps profissionais (Todoist, Linear, Asana)

#### 🎯 Padrões de UX Aplicados
- **Enter**: Criar tarefa e manter foco para próxima criação
- **Escape**: Limpar contexto quando input vazio, apenas texto quando tem conteúdo
- **Feedback Visual**: Spinner discreto durante criação (batch ou single)
- **Criação Contínua**: Input sempre pronto, não bloqueia durante criação única
- **Contexto Preservado**: Data/assignee mantidos entre criações para eficiência

---

## 2025-12-06 - Correção de Layout e Limite de Título em TaskRowMinify

### 1. Melhorias, bugs e features implementadas em preview

#### 🐛 Correção de Título Quebrando Layout
- **Problema**: Título da tarefa estava quebrando e passando por cima de outros elementos
- **Causa Identificada**:
  - Falta de `overflow-hidden` nos containers hierárquicos
  - `truncate` CSS não funcionava por falta de `min-w-0` e `block` no span
  - Estrutura de layout flex não respeitava limites do grid
- **Solução Implementada**:
  - Adicionado `overflow-hidden` em todos os níveis do container do título
  - Estrutura hierárquica corrigida com `min-w-0` em cada nível
  - Adicionado `block min-w-0` no span do InlineTextEdit para truncate funcionar
  - Wrapper extra com `overflow-hidden` para garantir isolamento do título
- **Resultado**: Título agora é truncado corretamente com ellipsis, respeitando layout do grid

#### ✨ Limite de Caracteres e Boas Práticas de UX
- **Limite de Caracteres no Título**:
  - Limite de **100 caracteres** no input durante edição
  - Validação em `handleSave` para garantir limite
  - Limite HTML nativo aplicado no input (`maxLength`)
  - Limitação durante digitação para feedback imediato
- **Tooltip Inteligente**:
  - Tooltip nativo (`title` attribute) mostra texto completo
  - Aparece apenas quando título tem mais de 70 caracteres (truncado)
  - Não mostra tooltip desnecessário em títulos curtos
- **Melhorias no InlineTextEdit**:
  - Prop `maxLength` adicionado à interface
  - Truncamento CSS funcionando corretamente com `block min-w-0`
  - Container com `overflow-hidden` para garantir isolamento
  - Layout responsivo mantido

#### 📐 Estrutura de Overflow Corrigida
```
Container Grid (min-w-0)
  └─ Título Container (min-w-0 overflow-hidden)
      └─ Flex Container (flex-1 min-w-0 overflow-hidden)
          └─ InlineTextEdit Wrapper (flex-1 min-w-0 overflow-hidden)
              └─ InlineTextEdit (block min-w-0 truncate)
```
- Cada nível da hierarquia tem controle de overflow
- `min-w-0` permite que flex items encolham abaixo de seu conteúdo mínimo
- `overflow-hidden` previne quebra de layout

#### 🎯 Padrões de UX Aplicados
- **Truncamento Visual**: CSS `truncate` com ellipsis funcionando corretamente
- **Limite de Caracteres**: 100 caracteres (padrão UX para títulos)
- **Tooltip Acessível**: Mostra título completo quando necessário
- **Layout Responsivo**: Não quebra o grid CSS, mantém estrutura
- **Feedback Durante Edição**: Limite aplicado em tempo real

---

## 2025-12-06 - UI Feedback e Optimistic UI para Criação de Tarefas

### 1. Melhorias, bugs e features implementadas em preview

#### ✨ Feedback Visual Durante Criação de Tarefas (Optimistic UI)
- **Componente TaskRowSkeleton**:
  - Novo componente de skeleton para feedback visual durante criação
  - Mantém consistência com design system (grid layout, cores, animação pulse)
  - Suporta cor do grupo (barra lateral colorida)
  - Animação suave e discreta

- **Estado isPending nas Tarefas**:
  - Campo `isPending` adicionado à interface `Task`
  - Tarefas otimistas marcadas como `isPending: true` durante criação
  - Estado removido após confirmação do backend
  - Suporte completo em todos os componentes de tarefas

- **Feedback Visual no TaskRowMinify**:
  - Spinner (`Loader2`) ao lado do título quando tarefa está `isPending`
  - Opacidade reduzida (60%) para toda a linha durante criação
  - Texto com opacidade reduzida (75%)
  - Edição inline desabilitada durante pending
  - Drag & drop desabilitado enquanto tarefa está sendo criada
  - Feedback visual claro sem ser intrusivo

- **Optimistic UI Pattern Implementado**:
  - Tarefas aparecem **imediatamente** ao criar (antes da confirmação do Supabase)
  - Estado de loading visível durante processo de criação
  - Rollback automático em caso de erro (remove tarefa otimista)
  - Substituição de ID temporário pelo ID real após sucesso
  - Snapshot do estado anterior para rollback seguro

- **Suporte a Criação em Lote (Batch)**:
  - Múltiplas tarefas aparecem instantaneamente ao criar batch
  - Cada tarefa mostra seu próprio estado de loading
  - Feedback individual por tarefa
  - Skeleton adicional mostrado quando necessário durante batch creation

- **Integração com QuickTaskAdd**:
  - Estado `isCreatingBatch` já existente mantido
  - Integração perfeita com Optimistic UI
  - Input limpo imediatamente após submissão
  - Foco mantido no input após criação

#### 🎯 Benefícios da Implementação
- **Perceived Performance**: Usuário vê tarefas aparecerem instantaneamente
- **Redução de Ansiedade**: Feedback visual claro durante processo assíncrono
- **Consistência**: Usa padrão Optimistic UI já documentado no Journal
- **Design Clean**: Feedback visual discreto e elegante, mantendo estética SaaS
- **UX Melhorada**: Interface não "congela" durante criação, mantém responsividade

#### 📝 Arquivos Criados/Modificados (Limite de Título)
- `components/tasks/TaskRowMinify.tsx` (correção de layout e overflow)
- `components/ui/inline-text-edit.tsx` (suporte a maxLength e truncamento)

#### 📝 Arquivos Criados/Modificados (Optimistic UI)
- `components/tasks/TaskRowSkeleton.tsx` (novo componente)
- `app/(main)/tasks/page.tsx` (estado isPending, handleTaskCreatedOptimistic)
- `components/tasks/TaskGroup.tsx` (suporte a skeleton e pending state)
- `components/tasks/TaskRowMinify.tsx` (feedback visual para pending state)

---

## 2025-12-06 - Correções de Performance e UX na Tela de Tarefas

### 1. Melhorias, bugs e features implementadas em preview

#### 🐛 Correção de Flicker na Ordem dos Grupos
- **Problema**: Ao carregar tarefas pela primeira vez, a ordem dos grupos ficava trocada por ~1 segundo
- **Causa Identificada**:
  - `initialGroups` (prop do Server Component) não estava sendo usado para inicializar estados
  - `availableGroups` e `groupOrder` iniciavam vazios
  - `loadGroups()` era assíncrono e rodava após o primeiro render
  - `orderedGroupedData` não estava ordenando baseado em `groupOrder`
  - Renderização condicional mostrava grupos em ordem errada enquanto `groupOrder.length === 0`
- **Solução Implementada**:
  - `availableGroups` agora inicializa com `initialGroups` se disponível
  - `groupOrder` inicializa com ordem correta desde o primeiro render:
    - Tenta usar ordem salva no localStorage (se existir e válida)
    - Valida que todos os IDs existem em `initialGroups`
    - Adiciona grupos novos que não estavam na ordem salva
    - Fallback para ordem padrão: `["inbox", ...initialGroups.map(g => g.id)]`
  - `orderedGroupedData` agora ordena grupos baseado em `groupOrder`
  - `listGroups` ordena grupos quando `viewOption === "group"` usando `groupOrder`
- **Resultado**: Flicker eliminado - grupos aparecem na ordem correta desde o primeiro render

#### ✨ Melhorias de Performance e Limpeza de Código
- **Remoção de console.log de debug**:
  - Removidos logs de debug desnecessários em `TaskRowMinify` e `TaskGroup`
  - Removidos logs de debug no `handleDragEnd` de `page.tsx`
  - Mantidos apenas `console.error` e `console.warn` para erros reais
- **Implementação de router.refresh()**:
  - Implementado `router.refresh()` no TODO da linha 310
  - Quando `initialTasks` está presente, página Server Component é recarregada após invalidar cache
  - Garante dados atualizados quando necessário sem necessidade de reload completo

#### 🔧 Otimizações Técnicas
- Dependências de `useMemo` corrigidas para incluir `groupOrder`
- Inicialização de estados otimizada usando funções lazy do `useState`
- Código mais limpo e manutenível sem logs de debug em produção

---

## 2025-01-XX - Limite de Caracteres, Truncamento Visual e Melhorias de UI no TaskDetailModal

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Limite de Caracteres e Truncamento Visual na Descrição
- **Limite Hard de 3000 Caracteres**:
  - Constante `MAX_DESCRIPTION_LENGTH = 3000` definida
  - Função `stripHtmlTags()` para extrair texto puro do HTML e contar caracteres precisamente
  - Contagem considera apenas texto visível, ignorando tags HTML
  
- **Contador de Caracteres no Modo de Edição**:
  - Exibido no canto inferior esquerdo: `${current}/${max}`
  - Estilo normal: `text-xs text-gray-400`
  - Quando excede limite: `text-xs text-red-500`
  - Mensagem de erro: "Limite de caracteres excedido." em vermelho
  - Botão "Concluir" desabilitado quando `current > max`
  
- **Truncamento Visual no Modo de Visualização**:
  - Apenas quando `!isEditingDescription`
  - Conteúdo truncado a `max-h-40` (160px) quando não expandido
  - Overlay com gradiente branco (`from-transparent to-white`) na parte inferior
  - Botão "Ver mais" centralizado abaixo do conteúdo truncado
  - Botão "Ver menos" quando expandido
  - `useRef` e `useEffect` para detectar se altura excede 160px
  - Botão aparece apenas quando necessário (evita mostrar em textos curtos)
  
- **Edição ao Clicar na Descrição**:
  - Clicar na descrição sempre entra em modo de edição
  - Botões "Ver mais/Ver menos" usam `stopPropagation()` para não ativar edição

#### ✅ Remoção de Bordas Cinzas (UI/UX)
- **Descrição no Modo de Visualização**:
  - Removidos outlines: `outline-none focus:outline-none focus-visible:outline-none active:outline-none`
  - Adicionado `tabIndex={-1}` para evitar foco via teclado
  - Adicionado `onMouseDown={(e) => e.preventDefault()}` para prevenir seleção de texto
  
- **Editor (Modo de Edição)**:
  - Removido `focus-within:ring-1 focus-within:ring-ring` do container externo
  - Substituído por `focus-within:ring-0 focus-within:outline-none`
  - Removido `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` do conteúdo
  - Substituído por `focus-visible:ring-0`
  - Mantida apenas borda padrão `border-gray-200`

## 2025-01-XX - Otimizações de Performance e Correções no TaskDetailModal

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Otimizações de Performance no TaskDetailModal
- **Isolamento do Timer do Gravador de Áudio (Performance Crítica)**:
  - Criado componente memoizado `AudioRecorderDisplay` que gerencia seu próprio estado de `recordingTime`
  - Timer agora atualiza apenas o componente filho, eliminando re-renders do modal inteiro a cada segundo
  - Componente recebe props: `stream`, `onCancel`, e `onStop(duration: number)`
  - Duração final é passada via callback `onStop` para o componente pai usar no upload
  
- **Otimização do Carregamento de Dados (Waterfall)**:
  - Removido `setTimeout` artificial de 50ms que causava delay desnecessário
  - `loadExtendedData()` agora é chamado via `.then()` após `loadBasicData()` concluir
  - Eliminado delay artificial, melhorando tempo de carregamento total
  
- **Memoização do Handler de Descrição**:
  - Extraída função anônima do botão "Concluir" para `handleSaveDescription` com `useCallback`
  - Reduz re-renders desnecessários do componente
  
- **Correção de UI Flickering (Flash Branco)**:
  - Removida dependência de `task?.id` na condição `shouldShowSkeleton`
  - Skeleton agora aparece imediatamente quando modal abre em modo edição, antes mesmo de `task` estar disponível
  - Elimina flash branco ao abrir o modal

#### ✅ Correção de Timezone na Data do TaskDetailModal

#### ✅ Correção de Timezone na Data do TaskDetailModal
- **Problema Identificado**: Data aparecia com um dia antes da data selecionada devido à conversão de timezone UTC para local
- **Causa Raiz**: `new Date("YYYY-MM-DD")` interpreta a string como UTC midnight, causando deslocamento ao converter para timezone local
- **Solução Implementada**:
  - Criada função `parseLocalDate()` que constrói a data diretamente no timezone local usando componentes de ano, mês e dia
  - Evita problemas de conversão UTC → local timezone
  - Aplicada na linha 1817 do `TaskDetailModal.tsx` ao passar data para `TaskDatePicker`

#### ✅ Cores Dinâmicas no TaskDatePicker
- **Implementação de Lógica de Cores Baseada em Status**:
  - **Vermelho (`text-red-600`)**: Data vencida (passada) e tarefa não completada
  - **Verde (`text-green-600`)**: Data é hoje
  - **Cinza (`text-gray-500`)**: Data futura ou tarefa completada (mesmo que a data seja passada)
  
- **Mudanças Técnicas**:
  - Adicionada prop opcional `isCompleted?: boolean` ao `TaskDatePicker`
  - Implementada função `getDateColor()` que calcula cor baseada em:
    - Comparação de data com hoje (usando apenas componentes de data, ignorando hora)
    - Status de conclusão da tarefa (`isCompleted`)
  - Atualizado trigger padrão para usar `getDateColor()` ao invés de sempre verde
  - `TaskDetailModal` agora passa `isCompleted={status === TASK_STATUS.DONE}` para o picker

- **Compatibilidade**:
  - Prop `isCompleted` é opcional (padrão `false`), mantendo compatibilidade com outros usos do componente
  - Outros componentes que usam `TaskDatePicker` continuam funcionando sem alterações

#### 📝 Arquivos Modificados
- `components/tasks/TaskDetailModal.tsx`:
  - Criado componente `AudioRecorderDisplay` memoizado (isolamento do timer)
  - Removido estado `recordingTime` e `useEffect` do timer do componente principal
  - Adicionada ref `finalDurationRef` para armazenar duração final
  - Removido `setTimeout` de 50ms, usando `.then()` para encadear carregamento
  - Criado `handleSaveDescription` com `useCallback`
  - Corrigida condição `shouldShowSkeleton` removendo dependência de `task?.id`
  - Adicionada função `parseLocalDate()` para conversão correta de timezone
  - Importado `TASK_STATUS` do arquivo de configuração
  - Passada prop `isCompleted` para `TaskDatePicker`
  - **Novo**: Implementado limite de 3000 caracteres com contador e validação
  - **Novo**: Implementado truncamento visual com "Ver mais/Ver menos"
  - **Novo**: Função `stripHtmlTags()` para contar caracteres sem HTML
  - **Novo**: Estados `isDescriptionExpanded`, `showExpandButton` e ref `descriptionRef`
  - **Novo**: `useEffect` para detectar altura do conteúdo e mostrar botão quando necessário
  - **Novo**: Removidos outlines da descrição no modo visualização
- `components/tasks/pickers/TaskDatePicker.tsx`:
  - Adicionada prop `isCompleted?: boolean` à interface
  - Implementada função `getDateColor()` para cálculo dinâmico de cores
  - Atualizado trigger padrão para usar cores dinâmicas
- `components/ui/editor.tsx`:
  - Removidos rings e outlines ao focar/clicar no editor
  - Substituído `focus-within:ring-1 focus-within:ring-ring` por `focus-within:ring-0 focus-within:outline-none`
  - Substituído `focus-visible:ring-2 focus-visible:ring-ring` por `focus-visible:ring-0`

**Total**: ~200+ inserções e ~40 deleções em 3 arquivos (commits anteriores + novas features)

### 2. O que está sendo trabalhado no momento

- ✅ **Correções concluídas e testadas**

### 3. Próximos passos

- **Melhorias futuras de UX**:
  - Considerar aplicar mesma lógica de cores em outros componentes que exibem datas (TaskRow, TaskCard, etc.)
  - Adicionar tooltip explicativo sobre o significado das cores
  - Suporte para timezone do usuário em configurações

---

## 2025-01-02 - Empty State Gold Standard e Welcome Modal (FTUX)

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Empty State Gold Standard para Visão Semanal
- **Componente EmptyWeekState:**
  - ✅ Design "Ghost Grid" que mantém contexto visual do calendário
  - ✅ Container com borda tracejada (`border-dashed border-slate-100`)
  - ✅ Altura fixa de 500px para consistência visual
  - ✅ Fundo sutil (`bg-slate-50/30`)
  - ✅ 4 divisores verticais internos sugerindo as 5 colunas do calendário
  - ✅ Ilustração SVG personalizada (`empty-state-coffee-weekly.svg`)
  - ✅ Título: "Por enquanto, nada por aqui..."
  - ✅ Subtítulo: "Aproveite o momento para tomar um café e planejar os próximos passos."
  - ✅ CTA: Botão ghost "Adicionar tarefa rápida"

- **Integração e UX:**
  - ✅ Substitui o conteúdo do grid quando `tasks.length === 0`
  - ✅ Mantém cabeçalho "Visão Semanal" para consistência
  - ✅ Grid com 5 colunas (`lg:grid-cols-5`) para ocupar toda largura
  - ✅ Corrigido erro de hidratação usando estado `isMounted`
  - ✅ CTA conectado ao fluxo de criação de tarefas existente

## 2025-01-02 - Welcome Modal (FTUX) e Melhorias de Email

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Welcome Modal (First Time User Experience - FTUX)
- **Componente OnboardingModal:**
  - ✅ Modal de boas-vindas usando Shadcn Dialog
  - ✅ Ilustração SVG personalizada (`/welcome-popup.svg`)
  - ✅ Título: "Sua operação, finalmente sob controle"
  - ✅ Texto de boas-vindas explicando o valor do Symples
  - ✅ Botão "Fechar" para dismissar o modal
  - ✅ Persistência em `localStorage` (`symples-welcome-seen`)
  - ✅ Aparece automaticamente quando usuário não tem tarefas e ainda não viu

- **Integração no Dashboard:**
  - ✅ Componente `HomePageClient` para orquestrar modal e visão semanal
  - ✅ Hook `useShouldShowOnboarding` para controlar exibição
  - ✅ Detecção de aceitação de invite para resetar flag de "visto"
  - ✅ Suporte para detectar invite aceito via URL (`invite_accepted=true`) ou cookie (`newly_accepted_workspace_id`)

- **Empty State da Visão Semanal:**
  - ✅ Placeholder minimalista "Tudo limpo por aqui" quando modal foi fechado
  - ✅ Grid vazio quando modal ainda não foi visto (aguardando exibição do modal)

#### ✅ Melhorias nos Emails Transacionais
- **Logo nos Emails:**
  - ✅ Logo do Symples (`/logo-black.svg`) agora aparece nos emails de convite
  - ✅ Mesmo logo usado no sidebar (consistência visual)
  - ✅ URL dinâmica baseada no domínio do inviteLink
  - ✅ Componente `Img` do `@react-email/components` para renderização correta

#### ✅ Refinamentos no Fluxo de Convites
- **Detecção de Invite Aceito:**
  - ✅ Resetar localStorage quando usuário aceita invite em novo workspace
  - ✅ Suporte para cookie `newly_accepted_workspace_id` (setado por `acceptInvite`)
  - ✅ Suporte para parâmetro URL `invite_accepted=true`
  - ✅ Limpeza automática do cookie após uso

## 2025-12-01 - Sistema Completo de Convites e Gestão de Membros

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Sistema Completo de Convites e Gestão de Membros (RBAC)
- **Infraestrutura de Email (Resend):**
  - ✅ Integração completa com Resend para emails transacionais
  - ✅ Abstração em `lib/email/send-invite.ts` para envio de convites
  - ✅ Templates React usando `@react-email/components` e `@react-email/render`
  - ✅ Template elegante de email de convite (`lib/email/templates/invite-email.tsx`)
  - ✅ Script de teste standalone (`scripts/test-email.js`) e API de teste (`/api/test-email`)

- **Backend (Server Actions):**
  - ✅ `inviteMember()`: Sistema completo de convites com dois cenários
    - Cenário A: Usuário já existe → Adiciona diretamente ao workspace
    - Cenário B: Usuário novo → Cria convite pendente e envia email
  - ✅ `revokeInvite()`: Cancelamento de convites pendentes
  - ✅ `resendInvite()`: Reenvio de convites
  - ✅ `acceptInvite()`: Aceite de convites com validações
  - ✅ `updateMemberRole()`: Alteração de roles com verificação de permissões
  - ✅ `removeMember()`: Remoção de membros com permissões
  - ✅ `getPendingInvites()`: Lista de convites pendentes
  - ✅ `getInviteDetails()`: Detalhes públicos de convites para página de aceite
  - ✅ Validações robustas: email, workspaceId, permissões (apenas owner/admin podem convidar)
  - ✅ Tratamento de erros com try-catch e logging detalhado

- **Frontend (UI de Gestão):**
  - ✅ Página `/settings` com aba "Membros" completa
  - ✅ Lista de membros: Avatar, Nome, Email, Role (badge colorida), Status
  - ✅ Lista de convites pendentes com badges de status
  - ✅ Modal de convite com seleção de role (admin, member, viewer)
  - ✅ Ações por membro: Remover, Alterar Role
  - ✅ Ações por convite: Cancelar, Reenviar
  - ✅ Contador de convites pendentes no cabeçalho
  - ✅ Roles traduzidas para português na UI
  - ✅ Feedback visual com toasts para todas as ações

- **Fluxo de Aceite de Convite:**
  - ✅ Página `/invite/[token]` para visualização e aceite de convites
  - ✅ Suporte para usuários não autenticados (mostra opções de login/signup)
  - ✅ Fluxo de signup com token de convite (`/signup?invite={token}`)
  - ✅ Aceite automático após login via Google ou signup
  - ✅ Callback de autenticação atualizado para aceitar convites automaticamente
  - ✅ Redirecionamento inteligente (evita onboarding após aceitar convite)

- **Políticas RLS (Row Level Security):**
  - ✅ Migração `20241201_allow_public_invite_read.sql`: Permite leitura pública de convites pendentes
  - ✅ Migração `20241201_allow_users_accept_invites.sql`: Permite que usuários aceitem convites inserindo-se em workspace_members
  - ✅ Validações de segurança em todas as ações de membros

- **Correções e Melhorias:**
  - ✅ Correção de erro 500 ao tentar convidar quando já existe convite (mensagens claras)
  - ✅ Correção de redirecionamento para onboarding após aceitar convite
  - ✅ Correção de problemas de hidratação em componentes Radix UI (UserNav, Tabs)
  - ✅ Validação de email e workspaceId antes de processar convites
  - ✅ Melhor tratamento de erros com mensagens amigáveis
  - ✅ Layout ajustado com retry para evitar redirecionamento prematuro

- **Documentação:**
  - ✅ `IMPLEMENTACAO_CONVITES.md`: Documentação completa do sistema
  - ✅ `TROUBLESHOOTING_EMAIL.md`: Guia de troubleshooting de emails
  - ✅ `DIAGNOSTICO_ERRO_500_INVITE.md`: Diagnóstico de erros
  - ✅ `CORRECAO_CONVITE_DUPLICADO.md`: Correção de erro de convite duplicado
  - ✅ `SOLUCAO_REDIRECIONAMENTO_ONBOARDING.md`: Solução para redirecionamento

---

## 🐛 Correções - Login Tradicional e Hidratação (2024-12)

### Problemas Corrigidos

- **Redirecionamento Incorreto para Onboarding:**
  - ❌ Após login tradicional (sem convite), usuários com workspaces eram redirecionados para `/onboarding`
  - ✅ **Correção:** Melhorada lógica no `MainLayout` e `auth/callback/route.ts`:
    - Adicionado `revalidatePath` após login tradicional para limpar cache
    - Busca usuário primeiro para garantir sessão estabelecida antes de buscar workspaces
    - Aguarda 100ms antes de buscar workspaces para evitar race conditions
    - Logs detalhados adicionados para diagnóstico

- **Erro de Hidratação em Popovers (TaskRowMinify):**
  - ❌ Popovers do Radix UI geravam IDs dinâmicos causando erro de hidratação
  - ✅ **Correção:** Implementado estado `isMounted` para renderizar Popovers apenas após montagem:
    - Popovers de Data, Responsável e Status agora renderizam placeholders durante SSR
    - Evita mismatch entre HTML do servidor e cliente

- **Erro de Hidratação em WeeklyViewWrapper:**
  - ❌ Extensões do navegador (ex: Bitdefender) adicionavam atributos como `bis_skin_checked` causando erro
  - ✅ **Correção:** Adicionado `suppressHydrationWarning` aos elementos placeholder:
    - Permite que extensões modifiquem HTML sem causar erros de hidratação

### Melhorias Técnicas

- **`lib/actions/user.ts` (`getUserWorkspaces`):**
  - ✅ Logs detalhados adicionados para diagnóstico
  - ✅ Melhor tratamento de joins que retornam arrays ou objetos
  - ✅ Tratamento de erro melhorado com informações detalhadas

- **`app/(main)/layout.tsx`:**
  - ✅ Busca usuário primeiro para garantir sessão estabelecida
  - ✅ Aguarda 100ms antes de buscar workspaces
  - ✅ Logs adicionais para diagnóstico de problemas de workspace

- **`app/auth/callback/route.ts`:**
  - ✅ Adicionado `revalidatePath` após login tradicional
  - ✅ Aguarda 200ms antes de verificar workspaces
  - ✅ Melhor validação de tokens de convite (não processa convites inválidos/expirados em logins tradicionais)

#### 📝 Arquivos Criados/Modificados
- **Novos arquivos:**
  - `app/(auth)/signup/page.tsx`: Página de cadastro
  - `components/landing/SignupForm.tsx`: Formulário de cadastro
  - `lib/email/send-invite.ts`: Abstração de envio de emails
  - `lib/email/templates/invite-email.tsx`: Template de email
  - `app/invite/[token]/page.tsx`: Página de aceite de convite
  - `app/api/test-email/route.ts`: API de teste de emails
  - `scripts/test-email.js`: Script de teste standalone
  - `supabase/migrations/20241201_allow_public_invite_read.sql`: RLS pública
  - `supabase/migrations/20241201_allow_users_accept_invites.sql`: RLS de aceite

- **Arquivos modificados:**
  - `lib/actions/members.ts`: Sistema completo de gestão (900+ linhas)
  - `lib/actions/auth.ts`: Suporte a token de convite no signup
  - `app/auth/callback/route.ts`: Aceite automático de convites
  - `app/(main)/layout.tsx`: Retry para evitar redirecionamento prematuro
  - `app/(main)/settings/settings-client.tsx`: UI completa de gestão
  - `components/layout/UserNav.tsx`: Correção de hidratação

### 2. O que está sendo trabalhado no momento

- **Validação e testes do sistema de convites:**
  - Testes de fluxo completo de convite → email → signup → aceite
  - Validação de permissões RBAC em todas as ações
  - Testes de casos edge (convite expirado, email já usado, etc.)

### 3. Próximos passos

- **Melhorias futuras:**
  - Notificações de convites no dashboard
  - Histórico de convites (aceitos, cancelados, expirados)
  - Convites em massa (múltiplos emails de uma vez)
  - Personalização de templates de email por workspace
  - Integração com notificações push para novos convites

---

## 2025-01-06 - Correção de Optimistic UI no TaskDetailModal

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Correção de Sincronização TaskDetailModal ↔ TaskRowMinify
- **Problema Identificado**: Atualizações no TaskDetailModal (status, assignee, dueDate, título) não refletiam imediatamente no TaskRowMinify, exigindo refresh manual da página.
- **Solução Implementada**: Sistema completo de optimistic updates com rollback automático.

#### 🔧 Mudanças Técnicas
- **Adicionada prop `onTaskUpdatedOptimistic` ao TaskDetailModal**:
  - Callback para atualização otimista de estado em componentes pais
  - Tipagem completa para suportar title, status, dueDate, priority, assignees
  
- **Modificado `invalidateCacheAndNotify`**:
  - Agora chama `onTaskUpdatedOptimistic` antes de invalidar cache
  - Garante sincronização imediata entre TaskDetailModal e TaskRowMinify
  - Mantém compatibilidade com código existente (prop opcional)

- **Handlers Atualizados com Optimistic UI**:
  - `handleStatusChange`: Atualiza TaskRowMinify imediatamente + rollback em erro
  - `handleAssigneeChange`: Atualiza assignees imediatamente + rollback em erro
  - `handleDueDateChange`: Atualiza dueDate imediatamente + rollback em erro
  - Handler de título: Atualiza título imediatamente via optimistic update
  
- **Integração nos Componentes Pais**:
  - `app/(main)/tasks/page.tsx`: Passa `handleOptimisticUpdate` para TaskDetailModal
  - `app/(main)/tasks/tasks-view.tsx`: Passa `handleOptimisticUpdate` para TaskDetailModal
  - Ambos atualizados para suportar priority e assigneeId sync

- **Melhorias no `handleOptimisticUpdate`**:
  - Sincroniza `assigneeId` automaticamente quando `assignees` muda
  - Mantém consistência entre arrays de assignees e ID único
  - Suporte completo para todos os campos: title, status, dueDate, priority, assignees

#### 🎯 Padrão Optimistic UI Aplicado
1. **Atualização Imediata**: UI atualiza ANTES da chamada ao servidor
2. **Chamada ao Servidor**: Executa em background (não bloqueia UI)
3. **Rollback Automático**: Em caso de erro, reverte para estado anterior
4. **Feedback Visual**: Toast notifications para sucesso/erro
5. **Sincronização de Estado**: Callback `onTaskUpdatedOptimistic` sincroniza com componentes pais

#### 📝 Arquivos Modificados
- `components/tasks/TaskDetailModal.tsx`: +60 linhas (prop + optimistic updates em handlers)
- `app/(main)/tasks/page.tsx`: +15 linhas (handleOptimisticUpdate melhorado + passagem de prop)
- `app/(main)/tasks/tasks-view.tsx`: +15 linhas (atualização de tipos + passagem de prop)

**Total**: ~90 inserções e ~10 deleções em 3 arquivos

### 2. O que está sendo trabalhado no momento

- ✅ **Correção concluída e testada pelo usuário**

### 3. Próximos passos

- **Melhorias futuras de UX**:
  - Considerar indicador visual de "salvando..." durante chamadas ao servidor
  - Debounce para atualização de título (evitar salvamentos excessivos)
  - Suporte para optimistic updates em outros campos (descrição, tags, subtarefas)

---

## 2025-01-XX - XX:XX (Data a ser preenchida)

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ Visão Semanal - Seletor de Data/Hora e Melhorias
- **TaskDateTimePicker**: Novo componente para seleção de data e hora
  - Popover com calendário e seletores de hora (0-23) e minuto (0, 15, 30, 45)
  - Atalhos rápidos: Hoje, Amanhã, Próxima Semana
  - Atualização imediata no componente pai ao selecionar data ou ajustar hora
  - Renderização apenas no cliente para evitar problemas de hidratação do React
  - Formato de exibição: `HH:MM` (24 horas)
  
- **DayColumn - Seletor de Data/Hora no Quick Add**:
  - Ícone de calendário clicável ao lado do campo de adicionar tarefa
  - Permite definir data e hora específica para tarefas pessoais
  - Data/hora selecionada é aplicada automaticamente ao criar tarefas
  - Limpa seleção após criar tarefas

- **TaskRow (Home) - Indicador de Horário**:
  - Badge cinza claro ao lado do título mostrando hora (HH:MM) para tarefas pessoais
  - Aparece apenas quando a tarefa tem hora específica (não é 00:00)
  - Estilo minimalista: `text-[10px] font-medium text-gray-600 px-1.5 py-0.5 rounded bg-gray-100`
  - Tooltip com horário completo ao passar o mouse

- **TaskRow (Home) - Badge de Workspace**:
  - Badge colorido ao lado do título para tarefas de workspace
  - Cor gerada a partir do `workspace_id` usando hash HSL
  - Exibe nome do workspace truncado (`max-w-[100px]`)
  - Estilo: `text-[10px] font-medium px-1.5 py-0.5 rounded text-white`

- **TaskRow (Home) - Ações Aprimoradas**:
  - Botão de calendário (apenas tarefas pessoais) para editar data/hora
  - Botão "Ir" (seta direita, apenas tarefas de workspace) para navegar aos detalhes
  - Navegação para `/[workspaceSlug]/tasks?taskId=[taskId]`
  - Renderização condicional para evitar problemas de hidratação

- **Ordenação de Tarefas na Visão Semanal**:
  - Ordem implementada: pessoais com horário > pessoais sem horário > workspace
  - Função `sortedTasks` ordena antes de renderizar
  - Mantém ordem original dentro de cada grupo

- **Correção de Filtro de Tarefas de Workspace**:
  - Tarefas de workspace aparecem apenas quando `assignee_id = user.id`
  - Tarefas pessoais aparecem quando `created_by = user.id` OU `assignee_id = user.id`
  - Implementado em `getWeekTasks` e `getDayTasks` com queries separadas

#### 🔧 Correções Técnicas
- **Problemas de Hidratação do React**:
  - Componentes Radix UI (Popover, DropdownMenu) renderizam apenas após montagem
  - Estado `isMounted` para detectar quando componente está no cliente
  - Evita mismatch de IDs entre servidor e cliente

#### 📝 Arquivos Modificados
- `components/tasks/pickers/TaskDateTimePicker.tsx`: Novo componente (254 linhas)
- `components/home/DayColumn.tsx`: Seletor de data/hora e ordenação
- `components/home/TaskRow.tsx`: Indicadores, badges e ações
- `lib/actions/dashboard.ts`: Correção de filtro de tarefas de workspace

### 2. O que está sendo trabalhado no momento

- **Validação e testes das novas funcionalidades**
  - Testes de seleção de data/hora em diferentes cenários
  - Validação de ordenação de tarefas
  - Verificação de filtro de tarefas de workspace

### 3. Próximos passos

- **Melhorias de UX no seletor de data/hora**
  - Considerar melhor feedback visual ao selecionar data/hora
  - Adicionar validação de data no passado (se necessário)
  - Suporte para timezone do usuário

---

## 2025-12-05 - 16:05

### 1. Melhorias, bugs e features implementadas em preview

#### ✅ TaskRow - Edição Inline de Título com Optimistic UI
- **Edição Inline**: Implementada edição direta do título da tarefa usando componente `InlineTextEdit`
  - Clique no título ou no ícone de lápis (aparece no hover) para editar
  - Auto-focus e seleção automática do texto ao entrar em modo de edição
  - Suporte a Enter (salvar) e Escape (cancelar)
  - Prevenção de propagação de eventos para evitar conflitos com cliques do container
  
- **Optimistic UI Pattern para Título**:
  - Atualização instantânea da interface antes da chamada ao servidor
  - Rollback automático em caso de erro, restaurando título anterior
  - Validação: título não pode estar vazio
  - Toast de feedback (sucesso/erro) para melhor UX
  - Callback `onTaskUpdatedOptimistic` para sincronização de estado local
  
- **Melhorias no InlineTextEdit**:
  - Ícone de lápis que aparece apenas no hover (`opacity-0 group-hover/title:opacity-100`)
  - Estado desabilitado com visual diferenciado (`cursor-default`)
  - Atualização automática quando a prop `value` muda externamente (apenas se não estiver editando)
  - Melhor tratamento de eventos (onClick, onMouseDown) para evitar conflitos

#### 🎨 Melhorias de Componentes Relacionados
- **TaskBoard**: Melhorias na integração com optimistic updates
- **TaskGroup**: Suporte aprimorado para callback `onTaskUpdatedOptimistic`
- **TaskList**: Integração completa com padrão optimistic UI
- **Página de Tarefas**: Handlers memoizados para melhor performance

#### 📝 Refatoração de Código
- **Arquivos modificados** (commit `e6bd2ff`):
  - `components/tasks/TaskRow.tsx`: +67 linhas (edição inline + optimistic UI)
  - `components/ui/inline-text-edit.tsx`: +66 linhas (melhorias de UX)
  - `components/tasks/TaskBoard.tsx`: +60 linhas (integração optimistic)
  - `components/tasks/TaskGroup.tsx`: +110 linhas (suporte optimistic)
  - `components/tasks/TaskList.tsx`: +3 linhas (ajustes)
  - `app/(main)/tasks/page.tsx`: +334 linhas (handlers e estado)

**Total**: ~525 inserções e ~115 deleções em 6 arquivos

### 2. O que está sendo trabalhado no momento

- **Validação e testes da edição inline**
  - Testes de edição rápida de títulos
  - Validação de rollback em caso de erro de rede
  - Verificação de performance com múltiplas edições simultâneas

### 3. Próximos passos

- **Melhorias de UX na edição inline**
  - Considerar debounce para evitar salvamentos excessivos durante digitação
  - Adicionar indicador visual de "salvando..." durante a chamada ao servidor
  - Suporte para edição inline em outros campos (descrição, tags)

---

## 2025-12-05 - 15:51

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


