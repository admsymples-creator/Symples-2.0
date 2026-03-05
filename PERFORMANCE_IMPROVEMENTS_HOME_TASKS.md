# Pontos de Melhoria de Performance - Card "Meu Trabalho" (Home)

## 📊 Análise do Componente: `HomeTasksSection.tsx`

### 🔴 **Problemas Críticos de Performance**

#### 1. **Busca de Membros em Loop Sequencial** ⚠️ CRÍTICO
**Localização:** `components/home/HomeTasksSection.tsx:174-234`

**Problema:**
```typescript
// Busca membros de cada workspace individualmente em loop
for (const workspaceId of workspaceIds) {
  try {
    const workspaceMembers = await getWorkspaceMembers(workspaceId);
    // ...
  }
}
```

**Impacto:** 
- N+1 queries ao banco de dados
- Se houver 5 workspaces, são 5 queries sequenciais
- Cada query pode levar 100-300ms, totalizando 500-1500ms apenas para buscar membros

**Solução:**
- Criar função `getWorkspaceMembersBatch(workspaceIds: string[])` que busca todos os membros de uma vez
- Usar query com `.in("workspace_id", workspaceIds)` no Supabase
- Reduzir de N queries para 1 query única

---

#### 2. **Recarregamento Completo Após Atualizações** ⚠️ CRÍTICO
**Localização:** `components/home/HomeTasksSection.tsx:298-359`

**Problema:**
```typescript
const handleTaskCreated = () => {
  // Recarrega TODAS as tarefas do zero
  const fetchedTasks = await getTasks({...});
  setTasks(fetchedTasks || []);
};
```

**Impacto:**
- Após cada atualização (criar, editar, deletar), recarrega todas as tarefas
- `getTasks` faz múltiplas queries (tasks, task_members, comments, groups)
- Pode levar 500-2000ms para recarregar tudo
- Experiência do usuário ruim (loading desnecessário)

**Solução:**
- Implementar atualização otimista completa
- Usar `onTaskUpdatedOptimistic` que já existe mas não está sendo usado corretamente
- Atualizar apenas a tarefa específica no estado local
- Só recarregar se houver erro na atualização

---

#### 3. **Busca de Usuário Atual em Cada Linha** ⚠️ ALTO
**Localização:** `components/tasks/MyTaskRowHome.tsx:172-184`

**Problema:**
```typescript
// Cada MyTaskRowHome busca o usuário atual individualmente
useEffect(() => {
  loadCurrentUser().then((user) => {
    setCurrentUser(user);
  });
}, []);
```

**Impacto:**
- Se houver 10 tarefas, são 10 buscas do mesmo usuário
- Embora tenha cache (`currentUserCache`), ainda há overhead de:
  - 10 chamadas de `useEffect`
  - 10 verificações de cache
  - 10 `setState` calls

**Solução:**
- Passar `currentUser` como prop do componente pai (`HomeTasksSection`)
- Buscar uma única vez no componente pai
- Passar para todos os `MyTaskRowHome` via props

---

#### 4. **dateRange Calculado Mas Não Usado** ⚠️ MÉDIO
**Localização:** `components/home/HomeTasksSection.tsx:47-73`

**Problema:**
```typescript
const dateRange = useMemo(() => {
  // Calcula range de datas...
  return { start: today.toISOString(), end: endOfWeek.toISOString() };
}, [period]);

// Mas NÃO é usado na query getTasks!
const fetchedTasks = await getTasks({
  workspaceId: currentWorkspace.id,
  assigneeId: "current",
  // dateRange NÃO é passado aqui!
});
```

**Impacto:**
- Cálculo desnecessário
- Busca TODAS as tarefas do usuário, não apenas do período
- Pode retornar centenas de tarefas quando só precisa de algumas

**Solução:**
- Passar `dueDateStart` e `dueDateEnd` para `getTasks`
- Filtrar no banco de dados (mais eficiente que no frontend)
- Reduzir quantidade de dados transferidos

---

### 🟡 **Problemas Moderados de Performance**

#### 5. **Múltiplos useEffect com Dependências Complexas** ⚠️ MÉDIO
**Localização:** `components/home/HomeTasksSection.tsx:76-123, 126-160, 163-171, 174-234`

**Problema:**
- 4 `useEffect` separados que podem disparar re-renders em cascata
- Dependências como `tasks`, `workspaces`, `pathname` podem mudar frequentemente
- Cada mudança pode disparar múltiplos re-renders

**Solução:**
- Consolidar lógica relacionada em um único `useEffect` quando possível
- Usar `useMemo` para valores derivados
- Usar `useCallback` para funções passadas como props

---

#### 6. **Falta de Debounce/Throttle em Operações** ⚠️ MÉDIO
**Localização:** `components/home/HomeTasksSection.tsx:298-359`

**Problema:**
- `handleTaskCreated` e `handleTaskUpdated` são chamados imediatamente
- Se o usuário fizer múltiplas ações rápidas, pode causar múltiplos recarregamentos

**Solução:**
- Implementar debounce para operações de atualização em lote
- Usar `startTransition` do React 18 para atualizações não urgentes

---

#### 7. **Filtragem e Ordenação no Frontend** ⚠️ MÉDIO
**Localização:** `components/home/HomeTasksSection.tsx:237-284`

**Problema:**
```typescript
// Busca todas as tarefas e filtra no frontend
const filteredTasks = useMemo(() => {
  return tasks.filter((task) => {
    // Filtragem complexa no cliente
  });
}, [tasks, statusFilter, dateRange]);
```

**Impacto:**
- Busca mais dados do que necessário
- Processamento no cliente (menos eficiente que no servidor)
- Mais memória usada

**Solução:**
- Mover filtragem para o backend quando possível
- Usar índices do banco de dados para queries mais rápidas
- Aplicar `statusFilter` na query do Supabase

---

#### 8. **Memoização Incompleta em MyTaskRowHome** ⚠️ BAIXO
**Localização:** `components/tasks/MyTaskRowHome.tsx:798-825`

**Problema:**
- `MyTaskRowHome` tem `memo`, mas a função de comparação é muito complexa
- Compara `JSON.stringify(prev.task.assignees)` que é custoso
- Pode não prevenir re-renders desnecessários

**Solução:**
- Simplificar função de comparação
- Comparar apenas IDs dos assignees, não objetos completos
- Usar `shallowEqual` para arrays

---

### 🟢 **Otimizações Adicionais**

#### 9. **Paginação Ineficiente**
**Localização:** `components/home/HomeTasksSection.tsx:287-289`

**Problema:**
- Busca todas as tarefas e depois limita no frontend
- Deveria buscar apenas o necessário do backend

**Solução:**
- Implementar paginação no backend
- Usar `.limit()` e `.range()` do Supabase
- Buscar mais itens conforme usuário clica em "Carregar mais"

---

#### 10. **Falta de Cache/Stale-While-Revalidate**
**Problema:**
- Sempre busca dados frescos do servidor
- Não há cache de dados recentes

**Solução:**
- Implementar cache com `React Query` ou similar
- Usar estratégia stale-while-revalidate
- Cachear dados por 30-60 segundos

---

#### 11. **AnimatePresence com Muitos Itens**
**Localização:** `components/home/HomeTasksSection.tsx:390-398`

**Problema:**
- Animações do Framer Motion podem ser custosas com muitos itens
- Cada tarefa tem animação de entrada/saída

**Solução:**
- Desabilitar animações quando há muitos itens (>20)
- Usar `shouldReduceMotion` mais agressivamente
- Considerar virtualização para listas grandes

---

## 📈 **Priorização de Melhorias**

### **Prioridade ALTA (Implementar Primeiro):**
1. ✅ Busca de membros em batch (reduz N queries para 1)
2. ✅ Atualização otimista completa (elimina recarregamentos)
3. ✅ Passar currentUser como prop (elimina N buscas)
4. ✅ Usar dateRange na query (reduz dados transferidos)

### **Prioridade MÉDIA:**
5. Consolidar useEffects
6. Implementar debounce/throttle
7. Mover filtragem para backend

### **Prioridade BAIXA:**
8. Melhorar memoização
9. Paginação no backend
10. Cache/Stale-While-Revalidate
11. Otimizar animações

---

## 🎯 **Impacto Esperado**

### **Antes das Otimizações:**
- Tempo de carregamento inicial: ~1500-3000ms
- Tempo após atualização: ~1000-2000ms
- Queries ao banco: 5-15 por carregamento
- Dados transferidos: ~500KB-2MB

### **Depois das Otimizações (Prioridade ALTA):**
- Tempo de carregamento inicial: ~500-1000ms (**-66%**)
- Tempo após atualização: ~50-200ms (**-90%**)
- Queries ao banco: 2-4 por carregamento (**-70%**)
- Dados transferidos: ~100-300KB (**-80%**)

---

## 🔧 **Próximos Passos**

1. Criar função `getWorkspaceMembersBatch` em `lib/actions/tasks.ts`
2. Refatorar `handleTaskCreated` e `handleTaskUpdated` para usar atualização otimista
3. Mover busca de `currentUser` para componente pai
4. Passar `dateRange` para `getTasks` e aplicar filtros no backend
5. Testar performance antes/depois com React DevTools Profiler

