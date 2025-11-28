**\# SYMPLES — Product Requirements Document (PRD)**  
**\*\*Versão:\*\* 2.0 (Full Scope: Business OS)**  
**\*\*Visão:\*\* "O Hub de Soluções do Empreendedor Digital."**  
**\*\*Slogan:\*\* "Gerir uma empresa tem que ser Symples."**  
**\*\*Status:\*\* Pronto para Desenvolvimento (Cursor Ready)**  
**\*\*Stack:\*\* Next.js 15, Supabase, n8n, OpenAI.**

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