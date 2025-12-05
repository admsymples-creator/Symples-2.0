# 🔍 AUDITORIA DE BACKEND - Filtros de Workspace e Permissões

**Data:** 2025-01-XX  
**Objetivo:** Identificar causa do vazamento de dados (tarefas de todos os workspaces aparecendo misturadas)

---

## 📋 RESUMO EXECUTIVO

**Problema Crítico Identificado:** A função `getTasks()` não aplica filtro de workspace quando `workspaceId` é `undefined` ou não é passado, retornando **TODAS as tarefas do usuário** independente do workspace.

**Status de Segurança:** ⚠️ **CRÍTICO** - Não há verificação de permissões (membro do workspace) antes de buscar tarefas.

---

## 1️⃣ RASTREIO DO `workspaceId`

### ✅ **Página Real (`app/(main)/tasks/page.tsx`)**
```typescript
const { activeWorkspaceId, isLoaded } = useWorkspace(); // Hook do SidebarProvider

const { tasks } = useTasks({
    workspaceId: activeWorkspaceId,  // ✅ Passa o ID
    tab: activeTab,
    enabled: isLoaded,
});
```

**Status:** ✅ O `workspaceId` é capturado do `SidebarProvider` (localStorage) e passado corretamente.

### ⚠️ **Página Minify (`app/(main)/tasks/minify/page.tsx`)**
```typescript
const workspaces = await getUserWorkspaces();
const activeWorkspaceId = workspaces[0]?.id ?? null;  // ⚠️ Pega o primeiro workspace

const initialTasks = await getTasks({ workspaceId: activeWorkspaceId });
```

**Status:** ⚠️ **PROBLEMA:** Usa sempre o primeiro workspace do usuário, não sincroniza com a sidebar.

---

## 2️⃣ ANÁLISE DA QUERY (`getTasks`)

### ❌ **BUG CRÍTICO: Filtro de Workspace Condicional**

```typescript:71:77:lib/actions/tasks.ts
if (filters?.workspaceId) {
  // Tarefas do Workspace
  query = query.eq("workspace_id", filters.workspaceId);
} else if (filters?.workspaceId === null) {
  // Tarefas Pessoais (sem workspace e criadas pelo usuário)
  query = query.is("workspace_id", null).eq("created_by", user.id);
}
```

**PROBLEMA:**
- Se `filters?.workspaceId` for `undefined` (não passado), **nenhum filtro é aplicado**.
- A query retorna **TODAS as tarefas do usuário** de todos os workspaces.

**Cenário de Falha:**
1. Usuário troca de workspace na sidebar → `activeWorkspaceId` muda.
2. Se `activeWorkspaceId` for `null` ou `undefined` momentaneamente, `getTasks()` retorna tudo.
3. Tarefas de múltiplos workspaces aparecem misturadas.

### ✅ **Filtro de Soft Delete**
```typescript:67:67:lib/actions/tasks.ts
.neq("status", "archived")
```
**Status:** ✅ Funcionando corretamente.

### ✅ **Filtro de Hierarquia (Grupos)**
```typescript:109:135:lib/actions/tasks.ts
// Busca grupos válidos do workspace
let validGroupIds: Set<string> | null = null;

if (filters?.workspaceId !== undefined) {
  // Busca grupos do workspace
  const { data: validGroups } = await groupsQuery;
  validGroupIds = new Set(validGroups.map((g: any) => g.id));
}

// Filtra tarefas cujos grupos pertencem ao workspace
if (validGroupIds !== null && task.group_id) {
  if (!validGroupIds.has(task.group.id)) {
    return false; // Grupo não pertence ao workspace
  }
}
```
**Status:** ✅ Funcionando, mas só se `workspaceId` for passado.

---

## 3️⃣ VERIFICAÇÃO DE SEGURANÇA (Roles/Permissões)

### ❌ **AUSÊNCIA DE VERIFICAÇÃO DE MEMBRO**

**Código Atual:**
```typescript:42:45:lib/actions/tasks.ts
const supabase = await createServerActionClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) return [];
```

**Problemas:**
1. ❌ **Não verifica se o usuário é membro do workspace** antes de buscar tarefas.
2. ❌ **Não verifica RLS (Row Level Security)** - assume que o Supabase está bloqueando.
3. ❌ **Qualquer usuário autenticado pode buscar tarefas de qualquer workspace** se souber o ID.

**Risco de Segurança:** 🔴 **ALTO**
- Usuário pode acessar tarefas de workspaces dos quais não é membro.
- Se RLS não estiver configurado corretamente, há vazamento de dados.

**Solução Recomendada:**
```typescript
// Verificar se usuário é membro do workspace
if (filters?.workspaceId) {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", filters.workspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    return []; // Usuário não é membro → retornar vazio
  }
}
```

---

## 4️⃣ MAPEAMENTO DE STATUS (Coluna "Doing")

### ✅ **Status no Banco de Dados**
```sql
status TEXT DEFAULT 'todo' NOT NULL 
  CHECK (status IN ('todo', 'in_progress', 'review', 'correction', 'done', 'archived'))
```

### ✅ **Status no Frontend Minify**
```typescript:9:13:app/(main)/tasks/tasks-view.minify.tsx
const columns: MinifyColumn[] = [
  { id: "todo", title: "Todo" },
  { id: "doing", title: "Doing" },
  { id: "done", title: "Done" },
];
```

### ✅ **Mapeamento DB → Frontend**
```typescript:19:37:app/(main)/tasks/tasks-view.minify.tsx
const mapTaskFromDBToMinify = (task: TaskWithDetails): MinifyTask => {
  const statusMap: Record<string, "todo" | "doing" | "done"> = {
    todo: "todo",
    in_progress: "doing",  // ✅ Mapeia corretamente
    done: "done",
    archived: "done",
  };
  // ...
};
```

### ✅ **Mapeamento Frontend → DB (Drag & Drop)**
```typescript:91:97:app/(main)/tasks/tasks-view.minify.tsx
const statusToDb: Record<MinifyTask["status"], "todo" | "in_progress" | "done"> = {
  todo: "todo",
  doing: "in_progress",  // ✅ Mapeia corretamente
  done: "done",
};
```

**Status:** ✅ **CORRETO** - O mapeamento está funcionando. Se o drag & drop falha, o problema não é o mapeamento de status.

---

## 🎯 CONCLUSÃO E RECOMENDAÇÕES

### **Problema Principal Identificado:**

1. **❌ Filtro de Workspace Não Aplicado Quando `undefined`:**
   - Se `filters?.workspaceId` for `undefined`, a query retorna todas as tarefas.
   - **Solução:** Sempre aplicar filtro, mesmo que seja `null` (tarefas pessoais).

2. **❌ Ausência de Verificação de Permissões:**
   - Não verifica se o usuário é membro do workspace.
   - **Solução:** Adicionar verificação de `workspace_members` antes de buscar tarefas.

3. **⚠️ Página Minify Não Sincroniza com Sidebar:**
   - Usa sempre o primeiro workspace, não reflete a seleção do usuário.
   - **Solução:** Sincronizar com `SidebarProvider` ou passar `workspaceId` via URL/cookie.

---

## 🔧 CORREÇÕES NECESSÁRIAS

### **Prioridade ALTA:**

1. **Corrigir `getTasks()` para sempre aplicar filtro:**
```typescript
// ANTES (BUGADO):
if (filters?.workspaceId) {
  query = query.eq("workspace_id", filters.workspaceId);
} else if (filters?.workspaceId === null) {
  query = query.is("workspace_id", null).eq("created_by", user.id);
}
// Se undefined → retorna TUDO ❌

// DEPOIS (CORRIGIDO):
if (filters?.workspaceId !== undefined) {
  if (filters.workspaceId === null) {
    // Tarefas pessoais
    query = query.is("workspace_id", null).eq("created_by", user.id);
  } else {
    // Tarefas do workspace
    query = query.eq("workspace_id", filters.workspaceId);
  }
} else {
  // Se não especificado, retornar vazio ou apenas pessoais
  query = query.is("workspace_id", null).eq("created_by", user.id);
}
```

2. **Adicionar verificação de membro do workspace:**
```typescript
if (filters?.workspaceId) {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", filters.workspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    console.warn(`Usuário ${user.id} não é membro do workspace ${filters.workspaceId}`);
    return []; // Retornar vazio se não for membro
  }
}
```

### **Prioridade MÉDIA:**

3. **Sincronizar Minify com Sidebar:**
   - Opção A: Converter `minify/page.tsx` para client component e usar `useWorkspace()`.
   - Opção B: Passar `workspaceId` via cookie/URL param.

---

## 📊 CHECKLIST DE VALIDAÇÃO

- [ ] `getTasks()` sempre aplica filtro de workspace (nunca retorna tudo)
- [ ] Verificação de membro do workspace implementada
- [ ] RLS (Row Level Security) configurado no Supabase
- [ ] Página Minify sincroniza com seleção da sidebar
- [ ] Testes de segurança: usuário não pode acessar tarefas de outros workspaces
- [ ] Logs de auditoria para acessos não autorizados

---

**Relatório gerado por:** Auto (Cursor AI)  
**Próximos passos:** Aplicar correções de Prioridade ALTA imediatamente.



