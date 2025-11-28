**\# SYMPLES — Design System & Tech Specs**  
\*\*Versão:\*\* 2.0 (Visual Match MVP)  
\*\*Source of Truth:\*\* Screenshots do MVP atual.  
\*\*Stack:\*\* Next.js 15, Tailwind CSS, Lucide React, Shadcn UI (base).

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

### 7.3. Modal de Tarefa (Task Detail)
- **Dimensões:** Widescreen (`max-w-6xl` ou `w-[90vw]`).
- **Layout:** Split-Screen Rígido.
  - **Esquerda (Editor):** Branco. Título Grande (`text-3xl bold`). Rich Text Toolbar. Arquivos em Grid (`grid-cols-2`).
  - **Direita (Contexto):** Cinza (`bg-gray-50`). Timeline conectada por linha vertical. Card de Origem do WhatsApp destacado.

### 7.4. Navegação (Sidebar & Header)
- **Sidebar:** Hierarquia Invertida. "Minha Semana" (Global) no topo. Seletor de Workspace e menus específicos abaixo de um divisor.
- **Header:** Controles de Visualização (3 Dias / 5 Dias) próximos ao título da seção, usando `Tabs` (Segmented Control).

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