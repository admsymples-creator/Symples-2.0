**\# SYMPLES — Design System & Tech Specs**  
\*\*Versão:\*\* 2.3 (Atualizado - Jan 2025)  
\*\*Source of Truth:\*\* Screenshots do MVP atual.  
\*\*Stack:\*\* Next.js 16.0.5, React 19.2.0, TypeScript 5, Tailwind CSS 4, Lucide React, Shadcn UI (base).

\---

**\#\# 1\. Identidade Visual (Refinada)**

**\#\#\# 1.1. Estilo "Clean SaaS"**  
A interface atual é predominantemente \*\*Light Mode\*\*, focada em clareza e legibilidade.  
\- \*\*Backgrounds:\*\* Brancos e Cinzas muito claros (\#F9FAFB).  
\- \*\*Bordas:\*\* Sutis e arredondadas.  
\- \*\*Acentos:\*\* Verde Esmeralda (Ações) e Roxo Suave (Estado Ativo na Sidebar).

\---

**\#\# 2\. Design Tokens (Tailwind Config)**

**\#\#\# 2.1. Paleta de Cores**  
| Token Tailwind | Hex Aproximado | Uso Visual |  
| :--- | :--- | :--- |  
| \`bg-brand-green\` | \*\*\#22C55E\*\* (Green-500) | Botões Primários ("Novo", "Comentar"), Ícone Chat |  
| \`text-brand-green\` | \*\*\#15803D\*\* (Green-700) | Textos de sucesso, Valores positivos |  
| \`bg-sidebar-active\` | \*\*\#EEF2FF\*\* (Indigo-50) | Item selecionado na Sidebar |  
| \`text-sidebar-active\` | \*\*\#4F46E5\*\* (Indigo-600) | Texto do item selecionado na Sidebar |  
| \`bg-background\` | \*\*\#F9FAFB\*\* (Gray-50) | Fundo geral da aplicação |  
| \`bg-surface\` | \*\*\#FFFFFF\*\* | Cards, Modais, Sidebar |  
| \`text-primary\` | \*\*\#111827\*\* (Gray-900) | Títulos, Valores |  
| \`text-secondary\` | \*\*\#6B7280\*\* (Gray-500) | Legendas, Descrições |  
| \`border-border\` | \*\*\#E5E7EB\*\* (Gray-200) | Divisores, Bordas de Cards |

**\#\#\# 2.2. Tipografia**  
\* \*\*Fonte:\*\* Inter (Padrão).  
\* \*\*Títulos (H1/H2):\*\* Semibold ou Bold. Ex: "Financeiro", "Acesso à Fullstacky".  
\* \*\*Corpo:\*\* Regular (400) para tabelas, Medium (500) para botões.

**\#\#\# 2.3. Bordas & Sombras**  
\* \*\*Radius:\*\*  
    \* \`rounded-lg\` (8px) para Inputs e Botões.  
    \* \`rounded-xl\` (12px) para Cards do Dashboard e Modal.  
    \* \`rounded-full\` para Badges de Status e Avatares.  
\* \*\*Shadow:\*\* \`shadow-sm\` para cards, \`shadow-lg\` para o Modal.

\---

**\#\# 3\. Layout & Estrutura**

**\#\#\# 3.1. Sidebar (Navegação)**  
\*Referência: Lado esquerdo de todas as imagens.\*  
\- \*\*Largura:\*\* Fixa (\~240-260px).  
\- \*\*Cor:\*\* Branca (\`bg-white\`) com borda direita (\`border-r\`).  
\- \*\*Estados:\*\*  
    \- \*Inativo:\* Texto cinza escuro, ícone cinza.  
    \- \*Ativo:\* Fundo roxo/azul bem claro (\`bg-indigo-50\`), texto roxo/azul escuro, barra lateral ou peso maior na fonte.  
\- \*\*Seções:\*\* Pessoal, Workspace, Rodapé (Config/Collapse).

**\#\#\# 3.2. Área Principal**  
\- \*\*Padding:\*\* Espaçamento generoso (\`p-6\` ou \`p-8\`) em torno do conteúdo.  
\- \*\*Header da Página:\*\* Título grande \+ Subtítulo cinza \+ Botões de Ação à direita.

\---

**\#\# 4\. Componentes UI (Específicos do MVP)**

**\#\#\# 4.1. Botões (\`Button\`)**  
\* \*\*Primary:\*\* Fundo Verde (\`bg-green-500\`), Texto Branco. Radius \`rounded-md\`. Ex: Botão "+ Novo".  
\* \*\*Ghost/Text:\*\* Fundo transparente, hover cinza claro. Ex: Ações da tabela ("...").  
\* \*\*FAB (Floating Action Button):\*\* Círculo verde flutuante no canto inferior direito com ícone de chat.

**\#\#\# 4.2. Cards de KPI (Financeiro)**  
\*Referência: image\_20e3f2.png\*  
\- \*\*Estilo:\*\* Container branco, sombra suave.  
\- \*\*Detalhe:\*\* Borda superior colorida (\`border-t-4\`) para indicar status:  
    \- Verde: Entradas.  
    \- Vermelho: Saídas.  
    \- Azul/Neutro: Saldo.

**\#\#\# 4.3. Tabela de Tarefas (\`TaskList\`)**  
\*Referência: image\_20e418.png\*  
\- \*\*Cabeçalho:\*\* Texto cinza, pequeno, uppercase ou font-medium.  
\- \*\*Linhas:\*\* Altura confortável (\`h-14\`), hover \`bg-gray-50\`.  
\- \*\*Status Badge:\*\*  
    \- \*Finalizado:\* Dot Verde \+ Texto "Finalizado".  
    \- \*Em progresso:\* Dot Amarelo \+ Texto.  
    \- \*Não iniciado:\* Dot Cinza \+ Texto.  
\- \*\*Avatares:\*\* Círculos pequenos, sobrepostos se houver mais de um.

**\#\#\# 4.4. Modal de Tarefa (\`TaskModal\`)**  
\*Referência: image\_20e453.png\*  
\- \*\*Backdrop:\*\* Escuro semi-transparente (\`bg-black/50\`).  
\- \*\*Container:\*\* Branco, centralizado, \`max-w-4xl\`, \`rounded-xl\`.  
\- \*\*Header:\*\* Breadcrumbs no topo ("Y Group / Comercial..."), Botões de fechar/expandir à direita.  
\- \*\*Layout Interno:\*\* Grid de 2 colunas (Esquerda: Campos / Direita: Chat e Logs).

**\#\#\# 4.5. Cards de Dia ("Minha Semana")**  
\*Referência: image\_20e492.png\*  
\- \*\*Layout:\*\* Colunas verticais para cada dia.  
\- \*\*Estado "Hoje":\*\* Borda verde (\`border-green-500\`) e fundo levemente esverdeado (\`bg-green-50\`).  
\- \*\*Empty State:\*\* Ilustração centralizada (cinza) \+ Botão ghost "+ Adicionar tarefa".

\---

**\#\# 5\. Diretrizes para o Cursor (AI Rules)**

1\.  \*\*Replicação Visual:\*\* Ao criar novos componentes, priorize o estilo \*\*Light Mode\*\* visto nos prints. Não crie componentes escuros por padrão.  
2\.  \*\*Cores:\*\* Use classes como \`text-green-600\` ou \`bg-green-500\` para elementos de sucesso/ação principal. Não use "Verde Neon" (\#C1DF18) a menos que especificamente solicitado para um destaque exótico.  
3\.  \*\*Iconografia:\*\* Use \`lucide-react\`. Ícones devem ser cinza (\`text-gray-500\`) por padrão, ou coloridos quando ativos.  
4\.  \*\*Interatividade:\*\*  
    \- Modais devem abrir sobre a tela atual (intercepting routes ou dialog shadcn).  
    \- O botão de Chat (FAB) deve estar sempre visível (\`fixed bottom-6 right-6\`).

## 6. ATUALIZAÇÕES V3.1 (Pós-Validação)

### 6.1. Padrão de Telas de Autenticação (Auth)
- **Layout:** Split-Screen Obrigatório.
- **Lado Esquerdo (Branding):** Fundo `bg-slate-900`. Contém Logo e Elementos de Navegação/Status (ex: Stepper).
- **Lado Direito (Ação):** Fundo `bg-white`. Formulários alinhados à esquerda (não centralizados).

### 6.2. Ajustes de Cores (A11y)
- **Botões Primários:** Usar `bg-green-600` (e não 500) para passar nos testes de contraste WCAG com texto branco.

### 6.3. Grid da Dashboard
- **Semana:** Grid de 5 colunas fixas em Desktop (`lg:grid-cols-5`). Proibido scroll horizontal para dias da semana.
- **Empty States:** Minimalistas (apenas borda tracejada e ícone), sem ilustrações grandes que poluem a visão.

## 7. ATUALIZAÇÕES V3.2 (Dashboard & Task Refinement)

### 7.1. Dashboard "The Cockpit"
- **Grid Semanal:**
  - **Colunas:** Altura fixa (`h-[600px]`) com scroll interno (`overflow-y-auto`).
  - **Visual:** Estilo "Clean". Sem bordas pesadas. Fundo `bg-gray-50` para dias inativos, `bg-green-50/30` para o dia atual.
  - **Quick Add:** Input fixo no rodapé da coluna. Estilo minimalista (sem borda total, apenas linha de base ou transparente).

### 7.2. Lista de Tarefas (Task Row)
- **Estilo:** "Checklist" (Linha) > "Card" (Caixa).
- **Container:** `border-b border-gray-100`, `py-2`, `hover:bg-gray-50`.
- **Identificação:**
  - **Workspace:** Barra vertical colorida na esquerda (`w-1 rounded-r`).
  - **Pessoal:** Sem barra (Clean).
- **Ações (Hover):**
  - "Grip" (Drag handle) na esquerda.
  - Botões "Raio" (Semana) e "Exclamação" (Urgente) na direita.

### 7.6. Visão Semanal (DayColumn)
- **Componente:** `components/home/DayColumn.tsx`
- **Layout:** 
  - Coluna vertical com altura dinâmica (`min-h-[500px] max-h-[80vh]`)
  - Scroll interno com custom scrollbar
  - Design refinado com gradientes sutis e bordas suaves
  - Destaque visual para dia atual: `bg-gradient-to-b from-green-50/60 to-white border-[1.5px] border-green-200/80`
  - Hover effects em dias inativos: `hover:border-gray-200 hover:bg-gray-50/50`
- **Header:**
  - Nome do dia em uppercase com tracking-wider
  - Data em destaque abaixo
  - Badge de contador de tarefas pendentes (aparece quando `pendingCount > 0`)
  - Cores dinâmicas: verde para hoje, cinza para outros dias
- **Quick Add (Input Area):**
  - Input no rodapé com design refinado
  - Textarea com auto-resize (máximo 120px de altura)
  - Ícone Plus que muda para ponto verde pulsante quando focado
  - Toolbar inferior que aparece quando focado ou com texto:
    - Botão customizado do `TaskDateTimePicker` com estado visual (verde quando data definida)
    - Dica "ENTER para salvar"
  - Blur effect no topo do footer para conteúdo scrollando
  - Estados visuais: ring verde e shadow quando focado
  - Tutorial highlight com animação pulse quando `highlightInput` está ativo
- **Ordenação de Tarefas (Memoizada com `useMemo`):**
  1. Tarefas pessoais com horário específico (não 00:00)
  2. Tarefas pessoais sem horário (00:00 ou sem data)
  3. Tarefas de workspace (apenas atribuídas ao usuário)
- **Empty State:**
  - Aparece apenas no hover do container (`opacity-0 group-hover/column:opacity-100`)
  - Design minimalista com ícone FolderOpen em círculo cinza
  - Texto "Tudo limpo" com subtítulo
- **Performance:**
  - Ordenação memoizada com `useMemo` para evitar recálculos
  - Contador de pendências memoizado
- **UX:**
  - Toast notifications para erros (via `sonner`)
  - Rollback automático do input em caso de erro
  - Espaço extra no final do scroll para não bater no input
- **Filtro de Workspace:**
  - Tarefas de workspace aparecem apenas quando `assignee_id = user.id`
  - Tarefas pessoais aparecem quando `created_by = user.id` OU `assignee_id = user.id`

### 7.3. Modal de Tarefa (Task Detail)
- **Dimensões:** Widescreen (`max-w-6xl` ou `w-[90vw]`).
- **Layout:** Split-Screen Rígido.
  - **Esquerda (Editor):** Branco. Título Grande (`text-3xl bold`). Rich Text Toolbar. Arquivos em Grid (`grid-cols-2`).
  - **Direita (Contexto):** Cinza (`bg-gray-50`). Timeline conectada por linha vertical. Card de Origem do WhatsApp destacado.

### 7.4. Navegação (Sidebar & Header)
- **Sidebar:** Hierarquia Invertida. "Minha Semana" (Global) no topo. Seletor de Workspace e menus específicos abaixo de um divisor.
- **Header:** Controles de Visualização (3 Dias / 5 Dias) próximos ao título da seção, usando `Tabs` (Segmented Control).

### 7.5. Controles de Visualização de Tarefas (Ordenar & Agrupar)
- **Ordenar (`SortMenu`):**
  - Local: Header da página de tarefas, à direita do campo de busca.
  - Comportamento:
    - Abre um `DropdownMenu` com opções de ordenação (`Status`, `Prioridade`, `Responsável`, `Título (A-Z)`).
    - A opção escolhida **não aplica imediatamente no banco**; ao clicar em **Aplicar**, a ordem é recalculada no frontend **e persistida** no campo `position` via RPC `updateTaskPositionsBulk`.
    - Mostra um **badge** com o rótulo do filtro ativo ao lado do texto "Ordenar".
  - URL:
    - Usa o parâmetro `?sort=key` (`status`, `priority`, `assignee`, `title`).
    - O estado visual do botão é derivado da URL (Source of Truth).

- **Agrupar (`GroupingMenu`):**
  - Local: Ao lado do botão "Ordenar", com ícone de grid.
  - Comportamento:
    - Usa `DropdownMenuRadioGroup` com opções (`none`, `status`, `priority`, `assignee`).
    - Ao selecionar uma opção, aplica o agrupamento **imediatamente** (não há botão "Aplicar").
    - Quando um agrupamento está ativo (`group !== none`), o botão:
      - Fica com borda verde e fundo verde claro.
      - Exibe um **badge** com o rótulo do agrupamento ativo (ex: `Status`, `Data`).
  - URL:
    - Usa o parâmetro `?group=key` (`none`, `status`, `priority`, `assignee`).
    - A UI sempre reflete o valor atual de `group` na URL.

## 8. ATUALIZAÇÕES V3.3 (Módulo Financeiro)

### 8.1. Dashboard Financeiro
- **Cards de KPI:**
  - Estilo: Borda superior colorida (`border-t-4`) para indicar status (Verde=Entrada, Vermelho=Saída, Azul=Saldo).
  - Tipografia: Valores em destaque (`text-3xl bold`).
- **Diagnóstico Visual (Health Card):**
  - Card de largura total com cor de fundo semântica (`bg-green-50` para saudável, `bg-red-50` para crítico).
  - Deve conter ícone de status e mensagem explicativa clara.

### 8.2. Modal de Transação (Smart Form)
- **Layout Híbrido:**
  - **Topo:** Seletor de Tipo (Entrada/Saída) como `Segmented Control` (Tabs largura total).
  - **Hero Input:** O valor monetário é o protagonista. Fonte gigante (`text-5xl`), centralizado, sem bordas de input. A cor do texto muda conforme o tipo (Verde/Vermelho).
  - **Corpo:** Campos secundários (Data, Categoria, Descrição) agrupados em um bloco visualmente distinto (fundo cinza claro ou lista com ícones à esquerda).
- **Ações:**
  - Botão Principal: Neutro Escuro (`bg-slate-900`). Não usar verde/vermelho para o botão de salvar para evitar poluição visual.

### 8.3. Listas Financeiras (Extrato)
- **Transaction Row:**
  - Layout compacto.
  - Ícone de categoria à esquerda (circular).
  - Valor alinhado à direita com cor semântica.
  - Data discreta abaixo do título.

  ## 7. ATUALIZAÇÕES V4.0 (Consolidação UX/UI)

### 7.1. Estrutura de Navegação Global
- **Sidebar (Hierarquia Invertida):**
  - **Topo:** "Minha Semana" (Visão Global/Pessoal).
  - **Divisor:** "ESPAÇO DE TRABALHO".
  - **Meio:** Seletor de Workspace (Dropdown) + Links de Contexto (Tarefas, Financeiro).
  - **Rodapé:** Link "Configurações" isolado.
  - **Estilo:** Item Ativo = `bg-green-50 text-green-700 font-semibold`.

- **Page Headers (Padrão "Two-Row"):**
  - **Linha 1:** Título H1 + Subtítulo (Esq) | Ação Primária Verde (Dir).
  - **Linha 2:** Navegação (Tabs/Segmented Control) (Esq) | Filtros e Ferramentas (Dir).
  - *Objetivo:* Consistência visual entre Dashboard, Tarefas e Financeiro.

### 7.2. Componentes de Tarefas (Task System)
- **Estilo "Clean Checklist" (Lista):**
  - Visual de linha simples (`border-b`), sem sombras pesadas.
  - **Diferenciação:** Barra vertical colorida na esquerda (`w-1 rounded-r`) para Workspaces. Sem barra para Pessoal.
  - **Hover Actions:** Drag Handle (`::`), Botão Raio (⚡) e Exclamação (🔥) aparecem apenas no hover (Desktop).
- **Estilo Kanban:**
  - **Empty State:** "Ghost Slot" (Box tracejado com botão gigante "+ Adicionar").
  - **Colunas:** Altura fixa com scroll interno.

### 7.3. Módulo Financeiro
- **Modal de Transação (Hero Input):**
  - **Topo:** Valor Monetário Gigante (`text-6xl`) centralizado.
  - **Meio:** Toggle Entrada (Verde)/Saída (Vermelho).
  - **Baixo:** Bloco de detalhes agrupado em fundo cinza (`bg-gray-50`).
  - **Ação:** Botões alinhados à direita (Cancelar Ghost + Salvar `bg-slate-900`).
- **Dashboard:**
  - Cards de Diagnóstico ("Saúde Financeira") com cor semântica de fundo.

### 7.4. Identidade Visual (Refinamentos)
- **Cor Primária:** `bg-green-600` (para melhor contraste em texto branco).
- **Calendário:** Componente `Calendar` com dias arredondados (`rounded-full`) e seleção verde.
- **AI Orb:** Componente "Dark Core" (Esfera escura com borda gradiente giratória).

## 8. ATUALIZAÇÕES V4.0 (AI & Final Polish)

### 8.1. Assistente IA (`/assistant`)
- **Empty State (Boas-vindas):**
  - **Hero:** Componente `AIOrb` (Esfera escura com borda gradiente giratória + Ícone Sparkles).
  - **Chips:** Grid de 4 sugestões rápidas ("Criar tarefa", "Ver saldo") abaixo do Orb.
- **Chat Interface (GlobalAssistantSheet):**
  - Header centralizado com título "Assistente Symples"
  - Área de chat com scroll automático
  - Zero state com saudação dinâmica e sugestões de ações
  - Input fixo no rodapé com botões para:
    - Upload de imagem/print
    - Gravação de áudio (máx. 2 minutos)
    - Envio de mensagem
  - Suporte a mensagens de texto, áudio e imagem
  - Transcrição automática de áudio usando OpenAI Whisper
  - Generative UI com componentes dinâmicos (KanbanConfirmationCard)
  - Estado "pensando" com ThinkingIndicator (orb + frases rotativas)
  - **Respostas Ricas:** A IA não retorna apenas texto. Ela renderiza **Mini-Cards** (Tarefas/Transações) dentro do fluxo da conversa.
  - **Input:** Barra flutuante com sombra forte (`shadow-xl`) na parte inferior.

### 8.2. Refinamentos Globais de UX
- **Input de Valor (Financeiro):**
  - Estilo "Calculadora": Fonte gigante (`text-6xl`), centralizada, sem bordas.
  - Hierarquia: Valor > Toggle (Entrada/Saída) > Detalhes.
- **Drag & Drop (Tarefas):**
  - Estilo "Linear": O *drag handle* (::) só aparece no hover da linha.
  - Lista limpa, sem ruído visual excessivo.
- **Navegação:**
  - Sidebar: Item ativo com fundo `bg-green-50` e texto `text-green-700` (Brand Consistency).
  - Header: Padrão "Two-Row" (Título em cima, Ferramentas em baixo) unificado entre Dashboard, Tarefas e Financeiro.

## 9. COMPONENTES IMPLEMENTADOS (v2.1)

### 9.1. Componentes de Layout
- **Sidebar (`components/layout/Sidebar.tsx`):**
  - Navegação hierárquica (Pessoal no topo, Workspace abaixo)
  - Suspense boundary para `useSearchParams()`
  - Workspace switcher com dropdown
  - Estados ativos com `bg-green-50 text-green-700`

- **Header (`components/layout/Header.tsx`):**
  - Padrão "Two-Row" consistente
  - Controles de visualização (Tabs/Segmented Control)
  - Integração com notificações

- **UserNav (`components/layout/UserNav.tsx`):**
  - Dropdown de usuário com avatar
  - Menu de ações rápidas
  - Integração com autenticação

- **NotificationsPopover (`components/layout/NotificationsPopover.tsx`):**
  - Sistema de notificações em tempo real
  - Badge de contador
  - Lista de notificações com ações

- **WelcomeEmptyState (`components/home/WelcomeEmptyState.tsx`):**
  - Estado vazio para First Time User Experience (FTUX)
  - Card centralizado com ícone Sparkles
  - Botão CTA verde para criar primeira tarefa
  - Integração com TaskDetailModal

- **WeeklyViewWrapper (`components/home/WeeklyViewWrapper.tsx`):**
  - Wrapper que gerencia estado vazio vs. grid semanal
  - Integra modal de criação de tarefas
  - Atualização automática após criação

### 9.2. Componentes de Tarefas
- **TaskDetailModal (`components/tasks/TaskDetailModal.tsx`):**
  - Modal widescreen (`max-w-6xl`)
  - Split-screen: Editor (esquerda) + Contexto (direita)
  - Rich text editor (`Editor` component)
  - Timeline de comentários e logs
  - Galeria de anexos com drag & drop
  - Upload de arquivos múltiplos via `react-dropzone`
  - Gravação de áudio em tempo real (`MediaRecorder API`)
  - Auto-save de campos com debounce
  - Preview de imagens e documentos
  - Estados de upload (loading, success, error)

- **TaskDateTimePicker (`components/tasks/pickers/TaskDateTimePicker.tsx`):**
  - Seletor de data e hora para tarefas pessoais
  - Popover com calendário e seletores de hora/minuto
  - Atalhos rápidos: Hoje, Amanhã, Próxima Semana
  - Atualização imediata no componente pai ao selecionar data/hora
  - Renderização apenas no cliente para evitar problemas de hidratação
  - Formato de exibição: `HH:MM` (24 horas)
  - Opções de minuto: 0, 15, 30, 45

- **TaskBoard (`components/tasks/TaskBoard.tsx`):**
  - Board Kanban com drag & drop (@dnd-kit)
  - Colunas com scroll interno
  - Empty states com "Ghost Slot"

- **TaskGroup (`components/tasks/TaskGroup.tsx`):**
  - Agrupamento por status, prioridade ou assignee
  - Indicador de cor do grupo (círculo colorido ao lado do título)
  - Espaçamento: `gap-6` entre grupos, `mt-4` nos títulos
  - Quick Add no rodapé
  - Ações de grupo (renomear, mudar cor, deletar)

- **TaskRow (`components/tasks/TaskRow.tsx`):**
  - Estilo "Clean Checklist"
  - Barra vertical colorida para workspace
  - Hover actions (drag handle, raio, exclamação)
  - **Edição Inline de Título**: Componente `InlineTextEdit` integrado para edição direta do título
    - Ícone de lápis aparece no hover (`group-hover/title:opacity-100`)
    - Atualização com Optimistic UI: interface atualiza antes da chamada ao servidor
    - Rollback automático em caso de erro, restaurando valor anterior
    - Validação: título não pode estar vazio
    - Callback `onTaskUpdatedOptimistic` para sincronização de estado local
  - **Optimistic UI Pattern**:
    - Atualização instantânea da UI antes da chamada ao servidor
    - Rollback automático em caso de erro
    - Garantia de imutabilidade em atualizações de estado
    - Toast de feedback (sucesso/erro) para melhor UX

- **TaskRow (Home/Dashboard) (`components/home/TaskRow.tsx`):**
  - Componente específico para visão semanal da home
  - **Indicador de Horário**: Badge cinza claro ao lado do título mostrando hora (HH:MM) para tarefas pessoais com hora específica
    - Aparece apenas quando `hasSpecificTime` é true (não é 00:00)
    - Estilo: `text-[10px] font-medium text-gray-600 px-1.5 py-0.5 rounded bg-gray-100`
    - Tooltip com horário completo ao passar o mouse
  - **Badge de Workspace**: Badge colorido ao lado do título para tarefas de workspace
    - Cor gerada a partir do `workspace_id` usando hash HSL
    - Estilo: `text-[10px] font-medium px-1.5 py-0.5 rounded text-white`
    - Truncado com `max-w-[100px]` para nomes longos
  - **Ações no Hover**:
    - Editar (lápis)
    - Calendário (apenas tarefas pessoais) - abre `TaskDateTimePicker` para editar data/hora
    - Excluir (lixeira)
    - Ir para detalhes (seta direita, apenas tarefas de workspace) - navega para `/[workspaceSlug]/tasks?taskId=[taskId]`
    - Mover para Workspace (seta curva, apenas tarefas pessoais)
  - **Renderização no Cliente**: Componentes Radix UI (DropdownMenu, Popover) renderizam apenas após montagem para evitar problemas de hidratação

- **TaskRowMinify (`components/tasks/TaskRowMinify.tsx`):**
  - **Layout**: CSS Grid com colunas fixas para alinhamento vertical
  - **Colunas**: `grid-cols-[40px_24px_1fr_90px_32px_130px_40px]`
    - Drag Handle (40px) | Checkbox (24px) | Título (1fr) | Data (90px) | Responsável (32px) | Status (130px) | Menu (40px)
  - **Altura**: `h-11` (44px) - Interface compacta
  - **Checkbox de Conclusão**: 
    - Posicionado após drag handle, antes do título
    - Visual verde quando marcado (`data-[state=checked]:bg-green-500`)
    - Título com `line-through` quando concluída
    - Integração com sistema de status (done/todo)
    - Optimistic UI com rollback automático
  - **Indicadores Visuais**:
    - **Data**: Date picker funcional com calendário, cores dinâmicas (vermelho/verde/cinza)
    - **Status**: Badge editável com popover para mudança rápida
    - **Responsável**: Avatar picker garantindo usuário atual sempre disponível
    - **Comentários**: Contador que aparece apenas quando há comentários
    - **Focus (⚡)**: Botão para mover tarefa para próximo domingo (aparece no hover)
    - **Urgente (⚠)**: Botão para marcar como urgente (aparece no hover)
  - **Indicador de Cor do Grupo**: Barra vertical colorida à esquerda (`w-1`, `absolute left-0`)
    - Suporta cores nomeadas (red, blue, green) e hex (#ffffff)
    - Mapeamento via `getGroupColorClass()`
  - **Optimistic UI**: Todas as atualizações usam padrão optimistic com rollback
    - Atualização instantânea antes da chamada ao servidor
    - Rollback automático em caso de erro
    - Callback `onTaskUpdatedOptimistic` para sincronização de estado
  - **Hover Actions**: Focus, Urgente e Comentários aparecem no hover dentro da coluna do título
    - Classe: `opacity-0 group-hover:opacity-100`
    - Mantém-se visível quando ativo (mesmo sem hover)

- **InlineTextEdit (`components/ui/inline-text-edit.tsx`):**
  - Componente de edição inline de texto
  - Auto-focus e seleção de texto ao entrar em modo de edição
  - Suporte a Enter (salvar) e Escape (cancelar)
  - Ícone de lápis no hover para indicar editabilidade
  - Prevenção de propagação de eventos para evitar conflitos com cliques do container
  - Atualização automática quando a prop `value` muda externamente (apenas se não estiver editando)
  - Estado desabilitado com visual diferenciado

- **AttachmentCard (`components/tasks/AttachmentCard.tsx`):**
  - Card compacto para exibição de anexos
  - Preview de imagens
  - Ícones por tipo de arquivo
  - Ações de download/remover

- **AudioMessageBubble (`components/tasks/AudioMessageBubble.tsx`):**
  - Player de áudio compacto
  - Controles de play/pause
  - Indicador de duração
  - Waveform visual (quando disponível)

- **Editor (`components/ui/editor.tsx`):**
  - Editor de texto rico baseado em Tiptap
  - Toolbar com formatação
  - Suporte a markdown
  - Integração com upload de imagens

### 9.3. Componentes Financeiros
- **CreateTransactionModal (`components/finance/CreateTransactionModal.tsx`):**
  - Hero Input: Valor monetário gigante (`text-6xl`)
  - Toggle Entrada/Saída (Verde/Vermelho)
  - Bloco de detalhes agrupado
  - Botão primário neutro (`bg-slate-900`)

### 9.4. Componentes de IA
- **AIOrb (`components/assistant/AIOrb.tsx`):**
  - Esfera escura (slate-950) com ícone Symples no centro
  - Animações condicionais baseadas em `isLoading` e `compact`
  - Suporte a diferentes tamanhos (normal e compacto para FAB)
  
- **ThinkingIndicator (`components/assistant/ThinkingIndicator.tsx`):**
  - Orb animado com anel verde girando (0.6s)
  - Ícone Symples no centro
  - Frases rotativas a cada 3 segundos com efeito shimmer
  - Usado durante processamento de mensagens

- **KanbanConfirmationCard (`components/assistant/KanbanConfirmationCard.tsx`):**
  - Card estilo Kanban para confirmação de criação de tarefas
  - Campos editáveis: título, descrição, data, responsável, prioridade, status
  - Botões de ação: Cancelar e Confirmar
  - Parte do sistema Generative UI
  - Esfera escura (`bg-slate-950`)
  - Borda gradiente giratória (animação CSS)
  - Ícone Sparkles centralizado
  - Efeito de brilho pulsante

### 9.5. Hooks Customizados Implementados
- **useTaskCache (`hooks/use-task-cache.ts`):**
  - Sistema de cache em memória para tarefas
  - TTL configurável (5min para básicos, 2min para estendidos)
  - Invalidação automática por tempo
  - Métodos: `getCachedBasic`, `getCachedExtended`, `setCachedBasic`, `setCachedExtended`, `invalidate`

- **useTaskPreload (`hooks/use-task-preload.ts`):**
  - Pré-carregamento inteligente de tarefas
  - Otimização de performance com preload de dados relacionados
  - Integração com sistema de cache

### 9.6. Componentes de IA e Áudio
- **CreateTaskFromAudioModal (`components/tasks/CreateTaskFromAudioModal.tsx`):**
  - Modal para criação de tarefas a partir de áudio
  - Transcrição automática via API
  - Extração de informações usando IA (título, data)
  - Resumo automático da transcrição
  - Interface otimizada com estados de loading

- **TaskImageLightbox (`components/tasks/TaskImageLightbox.tsx`):**
  - Visualizador de imagens em lightbox
  - Navegação entre imagens
  - Zoom e controles de imagem
  - Integração com galeria de anexos

### 9.7. APIs Implementadas
- **API de Transcrição (`app/api/audio/transcribe/route.ts`):**
  - Integração com OpenAI Whisper
  - Processamento de arquivos de áudio
  - Retorno de transcrição em texto

- **API de Extração de Informações (`app/api/ai/extract-task-info/route.ts`):**
  - Uso de GPT-4o-mini para extrair título e data
  - Processamento de texto de transcrições
  - Retorno estruturado em JSON

- **API de Resumo (`app/api/ai/summarize/route.ts`):**
  - Geração de resumos usando IA
  - Processamento de texto longo
  - Retorno de resumo conciso

### 9.8. Sistema de Compartilhamento
- **Página de Compartilhamento (`app/(main)/tasks/share/[token]/page.tsx`):**
  - Visualização pública de tarefas compartilhadas
  - Verificação de tokens
  - Validação de expiração
  - Integração com TaskDetailModal em modo público

- **Página de Erro (`app/(main)/tasks/error/page.tsx`):**
  - Tratamento de erros específicos para tarefas
  - Mensagens de erro amigáveis
  - Navegação de retorno

### 9.9. Padrões de Código Implementados
- **Suspense Boundaries:**
  - Todos os componentes que usam `useSearchParams()` devem estar envolvidos em `<Suspense>`
  - Fallbacks de loading minimalistas
  - Exemplos: `Sidebar.tsx`, `settings/page.tsx`

- **Server Actions:**
  - Todas as ações de dados são Server Actions (`"use server"`)
  - Revalidação de cache com `revalidatePath()`
  - Tratamento de erros consistente

- **TypeScript:**
  - Tipos gerados do Supabase (`database.types.ts`)
  - Interfaces explícitas para props de componentes
  - Validação de tipos em runtime quando necessário

- **Cache e Performance:**
  - Uso de hooks de cache para reduzir requisições
  - Preload de dados relacionados
  - TTL configurável para diferentes tipos de dados

## 10. DEPENDÊNCIAS PRINCIPAIS (v2.1)

- **Next.js:** 16.0.5 (App Router, Server Components, Server Actions)
- **React:** 19.2.0 (Concurrent Features, Server Components)
- **TypeScript:** 5.x
- **Supabase:** @supabase/ssr 0.8.0, @supabase/supabase-js 2.86.0
- **UI:** shadcn/ui (Radix UI primitives), Tailwind CSS 4
- **Animações:** framer-motion 12.23.24
- **Drag & Drop:** @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0
- **Ícones:** lucide-react 0.555.0
- **Utilitários:** date-fns 4.1.0, clsx 2.1.1, tailwind-merge 3.4.0

## 11. STATUS DE DEPLOY (v2.1)

- **Ambiente de Produção:** https://app.symples.org
- **Plataforma:** Vercel
- **Build Status:** ✅ Compilando sem erros
- **Variáveis de Ambiente:** Configuradas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **Deploy Automático:** Configurado para branch `master`

## 12. ESTADOS DE LOADING E FEEDBACK VISUAL (v2.2)

### 12.1. Feedback de Carregamento na Troca de Workspace
- **Overlay de Loading:**
  - Aparece durante a troca de workspace na página de tarefas
  - Estilo: Card centralizado com fundo branco (`bg-white`), sombra suave (`shadow-lg`)
  - Conteúdo: Ícone `Loader2` animado (`animate-spin`) + texto "Atualizando tarefas..."
  - Posicionamento: Sobre o conteúdo anterior com leve blur (`backdrop-blur-sm`) e opacidade (`bg-white/60`)
  - Objetivo: Evitar "piscar" de tela vazia e manter contexto visual durante o carregamento

- **Indicador no Título:**
  - Spinner discreto (`Loader2` com `w-4 h-4`) ao lado do título "Identidade do Workspace" em configurações
  - Cor: `text-gray-400`
  - Aparece apenas durante o carregamento do workspace ativo

- **Campos Desabilitados:**
  - Durante o carregamento, campos de formulário ficam desabilitados (`disabled`)
  - Estilo: `opacity-50 cursor-not-allowed`
  - Previne edições em dados incorretos durante a transição

### 12.2. Padrões de Performance
- **Carregamento Paralelo:**
  - Tarefas e grupos são carregados simultaneamente usando `Promise.all()`
  - Reduz tempo percebido de carregamento
  - Aplicado em: Troca de workspace, mudança de aba

- **Otimização de Requisições:**
  - Guard clauses para evitar chamadas ao backend quando não há dados necessários
  - Exemplo: Não buscar membros se `activeWorkspaceId` for `null`
  - Limpeza de estados ao trocar de contexto

### 12.3. Estados de Loading por Componente
- **TasksPage:**
  - `isLoadingTasks`: Controla overlay de loading principal
  - Feedback visual: Overlay centralizado com spinner e mensagem
  - Mantém conteúdo anterior visível (não limpa a tela)

- **SettingsPageClient:**
  - `isLoadingWorkspace`: Controla loading do workspace ativo
  - Feedback visual: Spinner no título + campos desabilitados
  - Recarrega membros e convites automaticamente ao trocar workspace

## 13. PRÓXIMOS PASSOS (FOCO DE UX/UI)

1. **Detalhes de Tarefas 100% (Arquivos, Áudio, etc.)**  
   - Refinar o layout do `TaskDetailModal` para acomodar:
     - Galeria de arquivos com preview em grid (`grid-cols-2`/`grid-cols-3`, zoom em modal secundário).  
     - Player de áudio compacto (waveform ou barra linear) com estados de reprodução claros.  
     - Separação visual entre “Origem do WhatsApp” (mensagem original) e “Arquivos adicionados pelo time”.
   - Padrões visuais:
     - Ícones de tipo de arquivo (documento, imagem, áudio) com cor semântica.  
     - Estados de upload (carregando, sucesso, erro) com feedback discreto (badges, tooltips, skeletons).

2. **Gestão de Usuários (UI de Administração)**  
   - Criar telas dedicadas para gestão de usuários:
     - Tabela com colunas: Nome, Email, Role, Último Acesso, Status.  
     - Dropdown de ações por linha (Alterar Role, Remover, Reenviar Convite).  
   - Padrões de feedback:
     - Dialogs de confirmação para ações destrutivas.  
     - Toasts (sonner) para sucesso/erro em operações.

3. **E-mails Transacionais (Resend) — Padrões Visuais**  
   - Definir templates base:
     - Layout “Symples” com header escuro, conteúdo claro e call-to-action verde.  
     - Componentes reutilizáveis de e-mail (botão primário, lista de itens, blocos de destaque).  
   - Garantir consistência entre:
     - Mensagens mostradas na UI (convites, alertas) e o conteúdo dos e-mails.  
     - Branding (cores, tipografia) entre app web e emails.

4. **Playbook (Onboarding Guiado na Interface)**  
   - Traduzir o playbook operacional em elementos de interface:
     - Banners contextuais nas primeiras sessões (ex: “Passo 1: Conecte o WhatsApp”).  
     - Checklists interativos no Dashboard (cards com progresso).  
     - Empty states orientados por caso de uso (“Você ainda não conectou o WhatsApp. Clique aqui para começar.”).

5. **Assistente com IA (Interação Guiada Visualmente)**  
   - Padronizar blocos de resposta do Assistente:
     - Cards de resumo de tarefas (lista compacta com CTA “Ver todas”).  
     - Cards financeiros (KPI com variação, trend e botão “Ver detalhes”).  
   - Padrões de entrada:
     - Chips de sugestão destacados abaixo do `AIOrb`.  
     - Histórico visual com separadores de sessão e data.

6. **Integração WhatsApp + Symples + n8n (Feedback Visual)**  
   - Criar telas de “Status de Integração”:
     - Card com estado da conexão (Conectado / Desconectado / Atenção).  
     - Timeline visual de eventos recentes (mensagens recebidas, tarefas criadas).  
   - Indicadores na UI:
     - Badge “Origem WhatsApp” em tarefas/transações vindas do fluxo de automação.  
     - Tooltips explicando automatizações ativas (ex: “Esta tarefa foi criada via fluxo n8n X”).

---

## 14. VISÃO SEMANAL - COMPONENTES E FUNCIONALIDADES (v2.3)

### 14.1. DayColumn (`components/home/DayColumn.tsx`)
- **Layout**: 
  - Coluna vertical com altura dinâmica (`min-h-[500px] max-h-[80vh]`)
  - Scroll interno com custom scrollbar
  - Design refinado com gradientes sutis e bordas suaves
  - Destaque visual para dia atual com gradiente verde
  - Hover effects em dias inativos
- **Header**:
  - Nome do dia em uppercase com tracking-wider
  - Data em destaque abaixo
  - Badge de contador de tarefas pendentes (quando `pendingCount > 0`)
  - Cores dinâmicas baseadas em `isToday`
- **Quick Add**: 
  - Input no rodapé com design card-like refinado
  - Textarea com auto-resize (máximo 120px)
  - Ícone Plus que muda para ponto verde pulsante quando focado
  - Toolbar inferior condicional com:
    - Botão customizado do `TaskDateTimePicker` com estado visual
    - Dica "ENTER para salvar"
  - Blur effect no topo do footer
  - Estados visuais aprimorados (ring verde, shadow, transform)
  - Tutorial highlight com animação pulse
- **Ordenação de Tarefas** (Memoizada com `useMemo`):
  1. Tarefas pessoais com horário específico (não 00:00)
  2. Tarefas pessoais sem horário (00:00 ou sem data)
  3. Tarefas de workspace (apenas atribuídas ao usuário)
- **Empty State**:
  - Aparece apenas no hover do container
  - Design minimalista com ícone e texto explicativo
- **Performance**:
  - Ordenação e contadores memoizados
  - Handlers otimizados
- **UX**:
  - Toast notifications para erros
  - Rollback automático em caso de erro
  - Espaço extra no final do scroll
- **Filtro de Workspace**:
  - Tarefas de workspace aparecem apenas quando `assignee_id = user.id`
  - Tarefas pessoais aparecem quando `created_by = user.id` OU `assignee_id = user.id`

### 14.2. WorkspaceCard (`components/home/WorkspaceCard.tsx`)
- **Componente**: Card de workspace na seção "Visão por Workspace" da home
- **Layout**: Card branco com borda arredondada (`rounded-xl`), sombra suave e hover effect
- **Estrutura**:
  - **Header**: Logo do workspace (ou imagem fallback) + Menu dropdown (MoreHorizontal)
  - **Corpo**: Nome do workspace em destaque
  - **Progresso da Semana**: 
    - Título "Progresso da Semana" (uppercase, cinza claro)
    - Percentual de conclusão (negrito, cinza escuro)
    - Barra de progresso verde (`bg-green-500`)
    - Quantidades abaixo da barra, alinhadas à direita: `[finalizadas] / [pendentes]`
  - **Rodapé**: Avatares dos membros (até 3) + Métricas (tarefas pendentes, comentários)
- **Funcionalidades**:
  - **Navegação**: Clique no card navega para `/{slug}/tasks` ou `/{id}/tasks`
  - **Integração com Contexto**: Atualiza workspace ativo no `SidebarProvider` ao clicar
  - **Menu Dropdown**: 
    - "Abrir workspace" (ícone FolderOpen) - navega para tarefas
    - "Configurações" (ícone Settings) - navega para `/settings` com workspace ativo
  - **Logo Real**: Usa `logo_url` do workspace quando disponível, fallback para imagens mockadas
  - **Membros Reais**: Exibe avatares reais dos membros do workspace (até 3), com fallback para avatares mockados
- **Dados**:
  - Recebe: `id`, `name`, `slug`, `logo_url`, `pendingCount`, `totalCount`, `members[]`
  - `pendingCount`: Tarefas pendentes da semana (status != "done" && != "archived")
  - `totalCount`: Total de tarefas da semana (filtradas por `due_date` entre início e fim da semana)
  - `completedCount`: Calculado como `totalCount - pendingCount`
- **Cálculo do Progresso**: `(totalCount - pendingCount) / totalCount * 100`
- **Estilo**: Hover effect com sombra aumentada e borda verde (`hover:border-green-200`)

### 14.3. TaskRow (Home) (`components/home/TaskRow.tsx`)
- **Indicador de Horário**: Badge cinza claro ao lado do título
  - Aparece apenas para tarefas pessoais com hora específica
  - Formato: `HH:MM` (24 horas)
  - Estilo: `text-[10px] font-medium text-gray-600 px-1.5 py-0.5 rounded bg-gray-100`
- **Badge de Workspace**: Badge colorido ao lado do título
  - Cor gerada a partir do `workspace_id` usando hash HSL
  - Exibe nome do workspace truncado
  - Estilo: `text-[10px] font-medium px-1.5 py-0.5 rounded text-white`
- **Ações no Hover**:
  - Editar (lápis)
  - Calendário (apenas tarefas pessoais) - edita data/hora
  - Excluir (lixeira)
  - Ir para detalhes (seta direita, apenas workspace) - navega para `/[workspaceSlug]/tasks?taskId=[taskId]`
  - Mover para Workspace (seta curva, apenas pessoais)

### 14.3. TaskDateTimePicker (`components/tasks/pickers/TaskDateTimePicker.tsx`)
- **Componente**: Seletor de data e hora com popover
- **Funcionalidades**:
  - Calendário para seleção de data
  - Seletores de hora (0-23) e minuto (0, 15, 30, 45)
  - Atalhos rápidos: Hoje, Amanhã, Próxima Semana
  - Atualização imediata no componente pai
  - Renderização apenas no cliente (evita problemas de hidratação)
- **Formato**: Exibe data e hora no formato `d MMM, HH:mm` (pt-BR)

### 14.4. WelcomeEmptyState (`components/home/WelcomeEmptyState.tsx`)
- **Componente**: Estado vazio para First Time User Experience (FTUX) no Dashboard
- **Props**: `workspaceName` (string, opcional), `onAction` (função callback)
- **Layout**: Card centralizado (`bg-white`, `border-gray-200`, `shadow-sm`) com padding generoso (`p-12`)
- **Elementos**:
  - **Ícone**: `Sparkles` (Lucide) em círculo verde claro (`bg-green-50`, `text-green-600`)
  - **Título**: "Bem-vindo ao [workspaceName]!" em `text-2xl font-bold text-gray-900`
  - **Subtítulo**: "Tudo pronto para começar? Crie sua primeira tarefa ou explore o menu." em `text-gray-600`
  - **CTA Button**: "Criar minha primeira tarefa" (`bg-green-600 hover:bg-green-700`)
- **Uso**: Aparece quando o usuário não tem tarefas na semana, substituindo o grid vazio

### 14.5. WeeklyViewWrapper (`components/home/WeeklyViewWrapper.tsx`)
- **Componente**: Wrapper client que gerencia estado do modal e lógica condicional
- **Props**: `tasks` (Task[]), `workspaces` (Array de workspaces)
- **Funcionalidades**:
  - Verifica se `tasks.length === 0`
  - Se vazio: renderiza `<WelcomeEmptyState />`
  - Se há tarefas: renderiza `<WeeklyView />` normalmente
  - Integra `TaskDetailModal` para criação de tarefas
  - Gerencia estado do modal (`isModalOpen`)
- **Callbacks**:
  - `handleCreateTask()`: Abre o modal em modo create
  - `handleTaskCreated()`: Fecha modal e atualiza página via `router.refresh()`
  - `handleTaskUpdated()`: Atualiza página após edição

## 15. Journal Visual de Preview

- Mudanças incrementais de UI/UX e ajustes finos de componentes em **preview** devem ser registradas em  
  `.context/journal-symples.md`, sempre com data e hora.  
- Este documento continua sendo o **guia canônico de padrões**; o journal documenta o histórico de
  refinamentos aplicados entre preview e produção.
