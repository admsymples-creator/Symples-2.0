**\# SYMPLES — Product Requirements Document (PRD)**  
**\*\*Versão:\*\* 2.1 (Full Scope: Business OS)**  
**\*\*Visão:\*\* "O Hub de Soluções do Empreendedor Digital."**  
**\*\*Slogan:\*\* "Gerir uma empresa tem que ser Symples."**  
**\*\*Status:\*\* Em Desenvolvimento Ativo (Preview estável em \`develop\`, Produção em \`master\`)**  
**\*\*Stack:\*\* Next.js 16.0.5, React 19, TypeScript, Supabase, Tailwind CSS, shadcn/ui, n8n, OpenAI.**

**\---**

**\#\# 1\. Visão Estratégica (The Hub)**

**\#\#\# 1.1. O Propósito**  
O Symples é o sistema operacional de pequenas empresas. Centralizamos \*\*Tarefas\*\* e \*\*Financeiro\*\* em uma interface web robusta, alimentada pela simplicidade de input do WhatsApp. O objetivo é reduzir drasticamente o esforço de gestão.

**\#\#\# 1.2. Dinâmica de Uso (Híbrida)**  
\- \*\*WhatsApp (Concierge):\*\* Entrada rápida de dados ("Paguei X", "Lembrar de Y") e consultas leves. Fluxo unidirecional ou reativo.  
\- \*\*Web Dashboard (HQ):\*\* Planejamento, gestão profunda, visão estratégica e configurações do negócio.

**\---**

**\#\# 2\. Mapa da Aplicação (App Router)**

A estrutura reflete uma arquitetura modular para suportar expansão futura.

\- \`/\` (Landing Page/Login)  
\- \`/onboarding\` (Fluxo de Configuração Inicial & Conexão WhatsApp)  
\- \`/app\` (Authenticated Layout)  
  \- \`/(modules)\`  
    \- \`/home\` (Visão Agregada: "Minha Semana")  
    \- \`/tasks\` (Gestão de Projetos e Time)  
    \- \`/finance\` (Fluxo de Caixa e Extrato)  
    \- \`/team\` (Gestão de Membros e Permissões \- \*\*NOVO\*\*)  
  \- \`/settings\` (Perfil, Workspace, Integrações)  
  \- \`/billing\` (Planos e Faturas \- \*\*NOVO\*\*)  
  \- \`/api\` (Webhooks n8n & Server Actions)

**\---**

**\#\# 3\. Especificações Funcionais (Módulos)**

**\#\#\# 3.1. Layout Global & Sidebar**  
\*Referência Visual: Design System v3.0.\*  
\- \*\*Sidebar:\*\* Navegação direta entre módulos (Home, Tarefas, Financeiro, Time).  
\- \*\*Workspace Switcher:\*\* Dropdown no topo para alternar entre empresas (Multi-tenancy).  
\- \*\*FAB:\*\* Botão flutuante verde sempre visível para suporte ou chat rápido.

**\#\#\# 3.2. Módulo: Minha Semana (Home)**  
\- \*\*Foco:\*\* O que é crítico para \*hoje\*.  
\- \*\*KPIs Rápidos:\*\* "Tarefas pendentes hoje" e "Saldo Atual Previsto".  
\- \*\*Grid Semanal:\*\* Visualização dos próximos 5 dias (colunas).  
\- \*\*Welcome Modal (FTUX):\*\* Modal de boas-vindas com ilustração personalizada que aparece automaticamente quando usuário não tem tarefas. Botão "Fechar" para dismissar. Persistência em localStorage.  
\- \*\*Empty State:\*\* Quando modal foi fechado e não há tarefas, exibe placeholder minimalista "Tudo limpo por aqui".  
\- \*\*Smart Highlight:\*\* Tarefas atrasadas ganham destaque visual (borda vermelha).

**\#\#\# 3.3. Módulo: Tarefas (Core)**  
\- \*\*Input WhatsApp:\*\* Áudio/Texto \-\> IA processa \-\> Tarefa criada.  
\- \*\*Dashboard:\*\* Listas agrupadas (Accordion), Drag & Drop (opcional na v1), Filtros por Responsável/Status.  
\- \*\*Modal de Detalhes:\*\*  
  \- Edição completa dos campos.  
  \- Checklist.  
  \- Anexos.  
  \- \*\*Chat Context:\*\* Player de áudio ou texto original do WhatsApp para rastreabilidade.

**\#\#\# 3.4. Módulo: Financeiro (Core)**  
\- \*\*Input WhatsApp:\*\* Foto de Nota Fiscal ou Áudio ("Gastei 50 no Uber") \-\> Transação criada.  
\- \*\*Dashboard:\*\*  
  \- Cards de KPI com bordas coloridas (Verde/Entrada, Vermelho/Saída, Azul/Saldo).  
  \- Tabela de Extrato.  
\- \*\*Vínculo:\*\* Capacidade de relacionar uma despesa a uma tarefa específica.

**\#\#\# 3.5. Módulo: Time & Permissões (\*\*NOVO\*\*)**  
\- \*\*Lista de Membros:\*\* Tabela com Nome, Email, Role.  
\- \*\*Convite:\*\* Botão "Convidar Membro" (envia email via Supabase Auth).  
\- \*\*Roles:\*\*  
  \- \*Viewer:\* Só vê tarefas atribuídas a ele.  
  \- \*Member:\* Vê tarefas gerais e cria transações.  
  \- \*Owner:\* Acesso total (Financeiro, Billing, Config).

**\#\#\# 3.6. Módulo: Configurações & Integração**  
\- \*\*Conexão WhatsApp:\*\* Exibe status e QR Code/Link para conectar.  
\- \*\*Magic Code:\*\* Exibe o código único (ex: \`\#START-123\`) para vincular o número.  
\- \*\*Categorias:\*\* CRUD de tags de tarefas e categorias financeiras.

**\#\#\# 3.7. Módulo: Billing (Monetização) (\*\*NOVO\*\*)**  
\- \*\*Planos:\*\* Cards comparativos (Free vs Pro).  
\- \*\*Gestão:\*\* Botão para portal de pagamento (Stripe/Pagar.me).  
\- \*\*Status:\*\* Indicador visual se a conta está ativa ou trial.

**\---**

**\#\# 4\. Fluxos de Usuário Críticos**

**\#\#\# 4.1. Onboarding (O "Aha\! Moment")**  
1\.  \*\*Cadastro:\*\* Email/Senha ou Google Auth.  
2\.  \*\*Setup Workspace:\*\* Nome da empresa \+ Segmento.  
3\.  \*\*Conexão WhatsApp:\*\* Tela exibe link direto \`wa.me/NUMERO\_BOT?text=\#CODIGO\_UNICO\`. O usuário clica, envia e está conectado.  
4\.  \*\*Primeira Ação:\*\* "Envie um áudio de teste agora para criar sua primeira tarefa".  
5\.  \*\*Sucesso:\*\* A tarefa aparece na tela em tempo real (Supabase Realtime).

**\#\#\# 4.2. Fluxo de Inteligência (n8n)**  
1\.  \*\*Recebe Mensagem.\*\*  
2\.  \*\*Identifica Workspace:\*\* Via número de telefone (\`sender\_phone\`).  
3\.  \*\*Router de Intenção:\*\*  
    \- É Financeiro? \-\> Cria Transação.  
    \- É Ação? \-\> Cria Tarefa.  
    \- É Dúvida? \-\> IA responde (Consultoria).  
4\.  \*\*Executa:\*\* Insere no Supabase.  
5\.  \*\*Feedback:\*\* Atualiza UI via Realtime e responde curto no WhatsApp.

**\---**

**\#\# 5\. Schema de Dados Completo (Supabase)**

**Adicionar estas tabelas e alterações ao \`schema.sql\` existente.**

---

## 6. ATUALIZAÇÕES DE ESCOPO V2.1 (Pós-Validação UX)

### 6.1. Refinamento do Onboarding (Fluxo de Ativação)
*Referência: Seção 4.1 anterior.*
1.  **Conexão Ativa:** O usuário deve enviar ativamente a mensagem com o código `#START...` para iniciar a janela de 24h da API do WhatsApp.
2.  **Mecanismo de "Skip":** Obrigatório incluir um botão "Pular por enquanto" no passo de conexão do WhatsApp.
    * *Motivo:* Usuários desktop podem não estar com o celular em mãos. Não podemos bloquear o acesso ao Dashboard.
    * *Comportamento:* Se pular, o usuário entra no sistema com status "WhatsApp Desconectado" e vê um aviso persistente (banner) no topo da Dashboard até conectar.

### 6.2. Refinamento da Dashboard (Minha Semana)
*Referência: Seção 3.2 anterior.*
1.  **Grid Unificado (The Cockpit):** Abandonar a ideia de carrossel ou scroll horizontal.
    * Em Desktop: Exibir 5 colunas (Segunda a Sexta) fixas lado a lado. Fim de semana aglutinado ou oculto se vazio.
2.  **Centralização de Tarefas:**
    * Não separar "Pessoal" de "Workspace" em listas diferentes.
    * Todas as tarefas aparecem no mesmo Grid do dia.
    * **Diferenciação:** Usar uma "Etiqueta" (Badge) ou pílula colorida dentro do card da tarefa para indicar a origem (ex: 🟢 Agência V4 | 🟣 Pessoal).


\`\`\`sql  
\-- 1\. Convites para Workspaces (Gestão de Time)  
CREATE TABLE public.workspace\_invites (  
    id UUID DEFAULT uuid\_generate\_v4() PRIMARY KEY,  
    workspace\_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,  
    email TEXT NOT NULL,  
    role workspace\_role DEFAULT 'editor',  
    status TEXT DEFAULT 'pending', \-- pending, accepted, expired  
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

**\-- 2\. Tabela Financeira (Transações)**  
CREATE TABLE public.transactions (  
    id UUID DEFAULT uuid\_generate\_v4() PRIMARY KEY,  
    workspace\_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,  
    related\_task\_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL, \-- Integração Hub  
    description TEXT NOT NULL,  
    amount DECIMAL(10, 2\) NOT NULL,  
    type TEXT CHECK (type IN ('income', 'expense')),  
    category TEXT DEFAULT 'Geral',  
    status TEXT DEFAULT 'pending', \-- paid, pending, scheduled  
    due\_date DATE DEFAULT CURRENT\_DATE,  
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

**\-- 3\. Logs de Auditoria (Segurança Empresarial)**  
CREATE TABLE public.audit\_logs (  
    id UUID DEFAULT uuid\_generate\_v4() PRIMARY KEY,  
    workspace\_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,  
    user\_id UUID REFERENCES public.profiles(id),  
    action TEXT NOT NULL, \-- ex: 'deleted\_task', 'invited\_member'  
    details JSONB,  
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- RLS Policies (Segurança)  
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.workspace\_invites ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.audit\_logs ENABLE ROW LEVEL SECURITY;

\-- Adicionar policies de leitura/escrita baseadas em "is\_workspace\_member" para as novas tabelas.  

## 7. REGRAS DE NEGÓCIO V2.2 (Task Logic)

### 7.1. Lógica de Visualização (Dashboard)
- **Modos de Visão:**
  - **5 Dias (Padrão):** Mostra a semana útil (Seg-Sex).
  - **3 Dias (Foco):** Lógica de "Janela Deslizante". Deve tentar centralizar o dia de "Hoje" (Ex: Ontem, **Hoje**, Amanhã).
- **Mobile:** Independente da seleção, exibe apenas 1 dia por vez (Lista vertical ou Carrossel).

### 7.2. Smart Triggers (Ações Rápidas na Tarefa)
- **Botão Raio (⚡):**
  - *Ação:* Move a `due_date` para o próximo Domingo (Fim do ciclo semanal).
  - *Estado:* Ícone fica Amarelo e fixo se a data for domingo.
- **Botão Exclamação (🔥):**
  - *Ação:* Move a `due_date` para Hoje E define `priority = 'high'`.
  - *Estado:* Ícone fica Vermelho e fixo.

### 7.3. Criação Rápida (Quick Add)
- **Local:** Rodapé da coluna do dia.
- **Comportamento:** Ao pressionar `Enter`:
  1. Cria a tarefa vinculada à data da coluna.
  2. Se estiver dentro de um Workspace filtrado, herda o ID. Se estiver na visão geral, cria como "Pessoal" (sem workspace_id).
  3. UI Optimistic: O input limpa imediatamente.

### 7.4. Uploads e Arquivos
- **Armazenamento:** Arquivos não residem no banco de dados. Devem ser enviados para o Supabase Storage.
- **Dupla Visualização:** Um upload feito no chat (Contexto) deve aparecer na Timeline E TAMBÉM na galeria de arquivos da tarefa (Editor).
## 8. REGRAS DE NEGÓCIO V2.3 (Finance Logic)

### 8.1. Transações e Recorrência
- **Estrutura:** Toda transação tem `amount`, `type` (income/expense), `status` (paid/pending) e `category`.
- **Recorrência (MVP):**
  - O sistema não cria transações futuras infinitas.
  - Existe uma flag `is_recurring` (boolean).
  - **Automação:** Um Job (n8n ou Cron) roda todo dia 1º e duplica as transações marcadas como `is_recurring` para o mês atual com status `pending`.

### 8.2. Diagnóstico de Saúde Financeira (Runway)
- **Cálculo de Status:**
  - *Saudável:* (Receitas Previstas - Despesas Previstas) > 0 E (Caixa Atual > 3x Custo Fixo).
  - *Atenção:* (Receitas - Despesas) < 0 MAS (Caixa Atual > Custo Fixo).
  - *Crítico:* (Receitas - Despesas) < 0 E (Caixa Atual < Custo Fixo).
- **Visualização:** O Dashboard deve exibir esse status de forma textual e colorida ("Você tem 3 meses de caixa").

### 8.3. Categorização
- **Categorias Padrão:** O sistema inicia com lista básica (Serviços, Software, Pessoal, Impostos).
- **Customização:** Usuário pode criar novas categorias (tabela `categories` vinculada ao `workspace_id`).

## 9. REGRAS DE NEGÓCIO V3.0 (Refinamento Lógico)

### 9.1. Autenticação & Roteamento (Smart Auth)
- **Métodos:** Google OAuth (Prioritário) + Magic Link.
- **Fluxo de Redirecionamento (Callback):**
  - Login Sucesso -> Verifica tabela `workspace_members`.
  - Se usuário tem workspace -> Redirect `/home`.
  - Se usuário NÃO tem workspace -> Redirect `/onboarding`.

### 9.2. Onboarding (Funil de Ativação)
- **Passo 2 (WhatsApp):**
  - O usuário deve enviar ativamente o código `#START` para iniciar a janela de 24h.
  - **Regra de Skip:** Deve haver um botão "Pular por enquanto" que permite acesso ao Dashboard com status "Desconectado".

### 9.3. Gestão de Tarefas (Task Logic)
- **Smart Triggers (Botões Rápidos):**
  - **Raio (⚡):** Define `due_date` para o próximo Domingo.
  - **Exclamação (🔥):** Define `due_date` para Hoje + Prioridade Alta.
- **Batch Create:**
  - O input "Quick Add" deve aceitar colar listas de texto. O sistema deve detectar quebras de linha e criar múltiplas tarefas automaticamente.
- **Drag & Drop:**
  - Persistência via campo `position` (float/double) no banco de dados.

### 9.4. Inteligência Artificial (Assistente)
- **Interação:** O chat não retorna apenas texto. Retorna JSON que o Frontend renderiza como **UI Components** (Cards de Tarefa, Gráficos).
- **Empty State:** Exibir "Suggestion Chips" (atalhos rápidos) quando não houver histórico.

## 10. FUNCIONALIDADES IMPLEMENTADAS (v2.1)

### 10.1. Módulos Core Implementados
- ✅ **Autenticação:** Sistema completo com Supabase Auth, callback routes e middleware
- ✅ **Dashboard (Minha Semana):** Grid semanal com visualização de tarefas por dia
- ✅ **Gestão de Tarefas:** Sistema completo com drag & drop, filtros, agrupamento e modal de detalhes
- ✅ **Sistema de Comentários:** Tabela `task_comments` com suporte a comentários, logs e metadados
- ✅ **Sistema de Anexos:** Tabela `task_attachments` para upload e gestão de arquivos
  - ✅ Upload de arquivos via drag & drop (`react-dropzone`)
  - ✅ Upload de áudio com gravação em tempo real (`MediaRecorder API`)
  - ✅ Preview de imagens e documentos
  - ✅ Integração com Supabase Storage via hook `useFileUpload`
  - ✅ Componentes `AttachmentCard` e `AudioMessageBubble` para exibição
- ✅ **Módulo Financeiro:** Dashboard com KPIs, extrato e modal de criação de transações
- ✅ **Gestão de Time e Convites:** Sistema completo de membros, convites e permissões (RBAC)
  - ✅ Tabela `workspace_invites` com status (pending, accepted, expired, cancelled)
  - ✅ Tabela `workspace_members` com roles (owner, admin, member, viewer)
  - ✅ Sistema de convites por email com integração Resend
  - ✅ Templates de email usando @react-email/components
  - ✅ Página de aceite de convite `/invite/[token]`
  - ✅ Fluxo de signup com token de convite
  - ✅ Políticas RLS para leitura pública de convites e aceite
  - ✅ UI completa em `/settings` com lista de membros e convites pendentes
  - ✅ Ações: convidar, cancelar, reenviar, remover membro, alterar role
- ✅ **Assistente IA:** Página `/assistant` com componente AIOrb e interface de chat
- ✅ **Configurações:** Página completa com abas para Geral, Membros e Faturamento
- ✅ **Logs de Auditoria:** Tabela `audit_logs` para rastreamento de ações

### 10.2. Componentes UI Implementados
- ✅ **AIOrb:** Esfera escura com borda gradiente giratória para o assistente
- ✅ **CreateTransactionModal:** Modal com hero input para valores monetários
- ✅ **NotificationsPopover:** Sistema de notificações
- ✅ **UserNav:** Navegação de usuário com dropdown
- ✅ **TaskDetailModal:** Modal completo para edição de tarefas
  - ✅ Editor de texto rico (`Editor` component)
  - ✅ Upload de arquivos com drag & drop
  - ✅ Gravação e upload de áudio
  - ✅ Timeline de atividades e comentários
  - ✅ Gestão de subtarefas
  - ✅ Sistema de tags
  - ✅ Auto-save de campos
- ✅ **TaskBoard:** Board Kanban com drag & drop
- ✅ **TaskGroup:** Agrupamento de tarefas por status, prioridade ou assignee
- ✅ **AttachmentCard:** Card para exibição de anexos com preview
- ✅ **AudioMessageBubble:** Componente para playback de mensagens de áudio

### 10.3. APIs e Integrações de IA Implementadas
- ✅ **API de Transcrição de Áudio:** `/api/audio/transcribe` - Converte áudio em texto usando OpenAI Whisper
- ✅ **API de Extração de Informações:** `/api/ai/extract-task-info` - Extrai título e data de tarefas de transcrições usando GPT-4o-mini
- ✅ **API de Resumo:** `/api/ai/summarize` - Gera resumos de texto usando IA
- ✅ **Integração OpenAI:** Configuração completa para processamento de linguagem natural

### 10.4. Sistema de Cache e Performance
- ✅ **Hook de Cache de Tarefas:** `use-task-cache.ts` - Sistema de cache em memória com TTL configurável
  - Cache de dados básicos: 5 minutos
  - Cache de dados estendidos: 2 minutos
  - Invalidação automática por tempo
- ✅ **Hook de Preload:** `use-task-preload.ts` - Pré-carregamento inteligente de tarefas para melhor UX
- ✅ **Otimização de Requisições:** Redução de chamadas desnecessárias ao Supabase

### 10.5. Sistema de Compartilhamento
- ✅ **Compartilhamento de Tarefas:** Sistema de tokens para compartilhar tarefas via URL pública
  - Rota `/tasks/share/[token]` para visualização pública
  - Tokens com expiração configurável
  - Verificação de permissões e validação de tokens
- ✅ **Página de Erro:** `/tasks/error` - Tratamento de erros específicos para tarefas

### 10.6. Componentes Avançados de Tarefas
- ✅ **CreateTaskFromAudioModal:** Modal completo para criar tarefas a partir de áudio
  - Transcrição automática de áudio
  - Extração inteligente de título e data usando IA
  - Resumo automático da transcrição
  - Interface otimizada para criação rápida
- ✅ **TaskImageLightbox:** Visualizador de imagens em lightbox para anexos
- ✅ **Melhorias no TaskDetailModal:**
  - Sistema de cache integrado para melhor performance
  - Preload de dados relacionados
  - Tratamento de erros aprimorado
  - Estados de loading otimizados

### 10.7. Correções Técnicas Implementadas
- ✅ **Suspense Boundaries:** `useSearchParams()` envolvido em Suspense em Sidebar e Settings
- ✅ **Tipos TypeScript:** Definições completas para `task_comments`, `task_attachments`, `workspace_invites`, `audit_logs`
- ✅ **Build Otimizado:** Projeto compila sem erros com Next.js 16.0.5
- ✅ **Estrutura Supabase:** Clientes separados para browser, server e middleware
- ✅ **Correções de Tipos:** Ajustes em `TaskRow` (`onEdit` retorna Promise), `finance/page.tsx` (campo `date` ao invés de `due_date`), `workspace-settings.ts` (tratamento de `role` nullable)
- ✅ **Deploy em Produção:** Aplicação deployada em https://app.symples.org via Vercel
- ✅ **Estratégia de Branches:** `develop` para desenvolvimento (Preview) e `master` para produção

### 10.8. Correções de Isolamento de Workspace (v2.2)
- ✅ **Isolamento de Tarefas por Workspace:**
  - Correção do filtro de `workspace_id` nas abas "Todas" e "Time" da página de tarefas
  - Tarefas agora são filtradas corretamente quando o usuário troca de workspace
  - Inbox (tarefas sem grupo) também isolado por workspace
  - Criação de novas tarefas agora usa o `workspace_id` ativo automaticamente
- ✅ **Sincronização de Configurações com Workspace Ativo:**
  - Página de configurações agora sincroniza com o workspace selecionado no contexto
  - Dados do workspace (nome, slug, logo) são recarregados automaticamente ao trocar de workspace
  - Membros e convites são atualizados dinamicamente conforme o workspace ativo
  - Função `getWorkspaceById()` criada para buscar dados específicos de um workspace
- ✅ **Otimização de Performance na Troca de Workspace:**
  - Carregamento paralelo de tarefas e grupos usando `Promise.all()`
  - Redução de chamadas desnecessárias ao backend (guard para membros quando não há workspace ativo)
  - Feedback visual de carregamento durante a troca de workspace (overlay com spinner)
  - Estados de loading consistentes em toda a interface
- ✅ **Correções de TypeScript no Build:**
  - Correção de `result.data` possivelmente `undefined` em `loadGroups()`
  - Tratamento seguro de `logo_url` que pode não existir na tabela `workspaces`
  - Build passa sem erros de TypeScript

### 10.9. Correções de Ações de Tarefas (v2.3)
- ✅ **Duplicação de Tarefas:**
  - Server Action `duplicateTask()` implementada em `lib/actions/tasks.ts`
  - Copia todos os campos da tarefa original (exceto `id`, `created_at`, `updated_at`)
  - Preserva: título (com sufixo "(Cópia)"), descrição, status, prioridade, data de vencimento, responsável, workspace, tags, subtarefas, grupo e contexto de origem
  - Define o usuário atual como criador da cópia
  - Integrada ao `TaskActionsMenu` com feedback visual e tratamento de erros
  - Revalidação automática dos caminhos `/tasks` e `/home` após duplicação

### 10.10. Sistema de Drag & Drop e Persistência de Posição (v2.4)
- ✅ **Implementação de Midpoint Calculation:**
  - Algoritmo de cálculo de posição usando média entre vizinhos (floating point math)
  - Evita colisões de posição e permite inserções infinitas entre itens
  - Reduz drasticamente a necessidade de re-indexação (bulk updates apenas em casos raros)
  - Posições calculadas: Topo (`nextTask.position / 2`), Meio (`(prev + next) / 2`), Final (`prev + 1000`)

- ✅ **Funções RPC no Banco de Dados:**
  - `move_task(UUID, DOUBLE PRECISION)`: Atualiza posição de uma tarefa individual
    - Retorna `JSONB` com `success`, `task_id`, `old_position`, `new_position`, `rows_affected`
    - Usa `SECURITY DEFINER` para contornar políticas RLS
    - Validação de permissões (workspace membership ou ownership)
    - Verificação pós-update usando `RETURNING` clause
  - `move_tasks_bulk(JSONB)`: Atualiza múltiplas posições em lote
    - Recebe array de `{id, position}` via JSONB
    - Processamento atômico para melhor performance
    - Validação individual de permissões para cada tarefa

- ✅ **Server Actions Otimizadas:**
  - `updateTaskPosition()`: Lida corretamente com retorno VOID/JSONB da RPC
  - `updateTaskPositionsBulk()`: Bulk update via RPC para melhor performance
  - Fallback automático para update direto se RPC não estiver disponível
  - Verificação pós-update no banco para garantir persistência

- ✅ **Lógica de Cálculo no Frontend:**
  - Cálculo de posição apenas para o item movido (não recalcula toda a lista)
  - Bulk update apenas em caso raro de colisão (espaço < 0.00001)
  - Estado local como source of truth com atualização otimista
  - Logs detalhados para debugging e diagnóstico

- ✅ **Scripts SQL de Manutenção:**
  - `SCRIPT_CORRIGIR_TIPO_POSICAO.sql`: Corrige tipo do parâmetro de INTEGER para DOUBLE PRECISION
  - `SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql`: Verifica e atualiza função move_task
  - `SCRIPT_VERIFICAR_POSICOES_SALVAS.sql`: Diagnóstico de posições no banco
  - `SCRIPT_REFRESH_TODAS_RPCS.sql`: Refresh completo do schema cache do PostgREST

- ✅ **Correções Técnicas:**
  - Interface `Task` atualizada com propriedade `position?: number`
  - Tratamento correto de retorno VOID da RPC (não verifica `data`)
  - Validação de tipos TypeScript para evitar erros de compilação
  - Logs estruturados para rastreamento de problemas

---

## 11. Próximos Passos (Roadmap Imediato)

1. **Detalhes de Tarefas 100% (Arquivos, Áudio, etc.)**  
   - Expandir o módulo de detalhes de tarefa (`TaskDetailModal`) para suportar totalmente:
     - Upload múltiplo de arquivos (documentos, imagens) com preview e gerenciamento (renomear, remover).  
     - Upload e playback de áudios (áudio do usuário e áudios vindos do WhatsApp/n8n).  
     - Sincronização completa com `task_attachments` e Supabase Storage, incluindo estados de upload e tratamento de erro.

2. ✅ **Gestão de Usuários (User Management Completo) - IMPLEMENTADO**  
   - ✅ Sistema completo de gestão de membros com roles (owner, admin, member, viewer)
   - ✅ Interface de administração em `/settings` com lista de membros e convites
   - ✅ Ações: convidar, remover, alterar role, cancelar/reenviar convites
   - ✅ Sistema de convites por email com integração Resend
   - ✅ Fluxo completo: convite → email → signup → aceite automático
   - ✅ Políticas RLS para segurança e controle de acesso
   - 🔄 **Próximas melhorias:**
     - Notificações de convites no dashboard
     - Histórico completo de convites (aceitos, cancelados, expirados)
     - Convites em massa (múltiplos emails)
     - Permissões granulares por módulo (Tasks, Finance, Settings, Billing)

3. ✅ **E-mails Transacionais com Resend (IMPLEMENTADO)**  
   - ✅ Integração Resend completa para envio de:
     - ✅ Convites de workspace (`workspace_invites`) com templates React
     - 🔄 Notificações de tarefa (atribuição, mudança de status, comentários) - Próximo passo
     - 🔄 E-mails de onboarding e reset de senha - Próximo passo
   - ✅ Camada de abstração (`lib/email/`) criada para centralizar templates e chamadas ao Resend
   - ✅ Templates usando `@react-email/components` e `@react-email/render`
   - ✅ Scripts de teste (`scripts/test-email.js`) e API de teste (`/api/test-email`)

4. **Playbook Operacional (Onboarding & Sucesso do Cliente)**  
   - Definir e documentar um playbook de uso do Symples:
     - Fluxo recomendado para novos clientes (primeiros 7 dias).  
     - Sequência de ações guiadas dentro do produto (checklist in-app).  
     - Templates de mensagens para suporte/concierge via WhatsApp.  
   - Parte desse playbook deve ser refletida na UI (empty states, tooltips e sugestões do Assistente IA).

5. **Assistente com IA (Versão 2.0)**  
   - Evoluir a página `/assistant` para:
     - Suportar comandos estruturados (ex: “resuma minha semana”, “mostre minhas despesas acima de 1k”).  
     - Responder com componentes ricos (cards de tarefa, gráficos financeiros, atalhos de ação).  
     - Contextualizar respostas com base no workspace atual, perfil do usuário e histórico de uso.  
   - Integrar melhor com n8n para automações disparadas pelo Assistente (ex: criar fluxos automáticos a partir de prompts).

6. **Integração WhatsApp + Symples + n8n (Ciclo Fechado)**  
   - Consolidar o fluxo ponta-a-ponta:
     - WhatsApp → n8n → Symples (criação/atualização de tarefas, transações, comentários).  
     - Symples → n8n → WhatsApp (confirmações, lembretes, alertas inteligentes).  
   - Garantir rastreabilidade completa:
     - Cada item vindo do WhatsApp deve ter origem claramente marcada no `origin_context`.  
     - Logs de auditoria registrando cenários críticos (ex: falhas de parsing, mensagens ignoradas).  
  - Documentar o fluxo em um diagrama (n8n + Supabase + Symples) e em um guia técnico (`docs/INTEGRACAO_WHATSAPP.md`).  

---

## 12. Journal de Preview (Fonte de Verdade Operacional)

- O estado **vivido** do produto em preview (melhorias, bugs corrigidos e features liberadas) é rastreado em  
  `.context/journal-symples.md`.  
- Este PRD permanece como visão macro e regras de negócio; o **journal** detalha a linha do tempo de entrega
  entre preview e produção.
