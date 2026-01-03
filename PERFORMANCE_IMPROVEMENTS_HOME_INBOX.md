# Pontos de Melhoria de Performance - Card "Caixa de Entrada" (Home)

## 📊 Análise do Componente: `HomeInboxSection.tsx`

### 🔴 **Problemas Críticos de Performance**

#### 1. **Busca 100 Notificações Mas Filtra no Frontend** ⚠️ CRÍTICO
**Localização:** `components/home/HomeInboxSection.tsx:24, 27-48`

**Problema:**
```typescript
// Busca 100 notificações do servidor
const fetchedNotifications = await getNotifications({ limit: 100 });

// Depois filtra no frontend por workspace
let filteredNotifications = fetchedNotifications || [];
if (activeWorkspaceId) {
  filteredNotifications = filteredNotifications.filter((notification) => {
    // Filtragem complexa no cliente
  });
}
```

**Impacto:**
- Busca 100 notificações quando pode precisar de apenas 5-10
- Transferência de dados desnecessária (~50-200KB)
- Processamento no cliente (menos eficiente)
- Se houver 10 workspaces, busca 100 notificações de todos mas mostra apenas ~10

**Solução:**
- Passar `workspaceId` como parâmetro para `getNotifications`
- Filtrar no backend usando query do Supabase
- Reduzir `limit` padrão para 20-30
- Aplicar filtro de workspace na query SQL

---

#### 2. **getNotifications Faz 3 Queries Separadas** ⚠️ CRÍTICO
**Localização:** `lib/actions/notifications.ts:32-138`

**Problema:**
```typescript
// Query 1: Buscar notificações
const { data: notifications } = await query;

// Query 2: Buscar profiles dos triggering users
const { data: users } = await supabase
  .from("profiles")
  .select("id, full_name, avatar_url")
  .in("id", triggeringUserIds);

// Query 3: Buscar workspace_id das tarefas
const { data: tasks } = await supabase
  .from("tasks")
  .select("id, workspace_id")
  .in("id", taskIds);
```

**Impacto:**
- 3 round-trips ao banco de dados
- Latência acumulada: ~300-900ms (3 queries × 100-300ms cada)
- Overhead de rede: 3 conexões/transações

**Solução:**
- Usar JOINs no Supabase para buscar tudo em uma query
- Usar `.select()` com relacionamentos aninhados:
  ```typescript
  .select(`
    *,
    triggering_user:triggering_user_id (
      full_name,
      avatar_url
    ),
    task:resource_id (
      workspace_id
    )
  `)
  ```
- Reduzir de 3 queries para 1 query única

---

#### 3. **Busca workspace_id de Tarefas em Query Separada** ⚠️ ALTO
**Localização:** `lib/actions/notifications.ts:98-115`

**Problema:**
```typescript
// Busca workspace_id das tarefas em query separada
const taskNotifications = notifications.filter(n => n.resource_type === 'task');
const taskIds = taskNotifications.map(n => n.resource_id);

if (taskIds.length > 0) {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, workspace_id")
    .in("id", taskIds);
}
```

**Impacto:**
- Query adicional desnecessária
- Poderia ser feito com JOIN na query principal
- Latência extra: ~100-300ms

**Solução:**
- Usar relacionamento no Supabase:
  ```typescript
  task:resource_id (
    workspace_id
  )
  ```
- Incluir na query principal com `.select()`

---

#### 4. **Filtragem de Workspace no Frontend** ⚠️ ALTO
**Localização:** `components/home/HomeInboxSection.tsx:26-48`

**Problema:**
```typescript
// Busca todas as notificações e filtra no cliente
let filteredNotifications = fetchedNotifications || [];
if (activeWorkspaceId) {
  filteredNotifications = filteredNotifications.filter((notification) => {
    const metadata = notification.metadata as any;
    // Lógica complexa de filtragem no cliente
  });
}
```

**Impacto:**
- Processamento no cliente (menos eficiente)
- Busca mais dados do que necessário
- Lógica de filtragem complexa executada no frontend

**Solução:**
- Passar `workspaceId` para `getNotifications`
- Filtrar no backend usando query do Supabase
- Usar filtro direto na tabela `notifications` ou via metadata

---

### 🟡 **Problemas Moderados de Performance**

#### 5. **Sem Cache/Stale-While-Revalidate** ⚠️ MÉDIO
**Localização:** `components/home/HomeInboxSection.tsx:17-60`

**Problema:**
- Sempre busca dados frescos do servidor
- Não há cache de notificações recentes
- Recarrega toda vez que o componente monta

**Solução:**
- Implementar cache com React Query ou similar
- Usar estratégia stale-while-revalidate
- Cachear notificações por 30-60 segundos
- Invalidar cache apenas quando necessário (nova notificação, marcar como lida)

---

#### 6. **Paginação Ineficiente** ⚠️ MÉDIO
**Localização:** `components/home/HomeInboxSection.tsx:13, 62-67`

**Problema:**
```typescript
const [displayLimit, setDisplayLimit] = useState(5);
const displayedNotifications = notifications.slice(0, displayLimit);
```

**Impacto:**
- Busca 100 notificações mas mostra apenas 5
- Aumenta para 10, 15, etc. mas já tem tudo em memória
- Não há paginação real no backend

**Solução:**
- Implementar paginação no backend
- Buscar apenas o necessário (5, depois 10, etc.)
- Usar cursor-based pagination ou offset/limit
- Reduzir dados transferidos

---

#### 7. **NotificationItem Não Está Memoizado** ⚠️ MÉDIO
**Localização:** `components/notifications/notification-item.tsx:45`

**Problema:**
- `NotificationItem` não usa `React.memo`
- Re-renderiza quando lista de notificações muda
- Cada item recalcula `formatDistanceToNow` a cada render

**Impacto:**
- Re-renders desnecessários quando uma notificação é marcada como lida
- Todos os itens re-renderizam mesmo que não mudaram
- Cálculo de `timeAgo` repetido

**Solução:**
- Envolver `NotificationItem` com `React.memo`
- Memoizar cálculo de `timeAgo` com `useMemo`
- Comparar apenas `id` e `read_at` na função de comparação

---

#### 8. **formatDistanceToNow Recalculado a Cada Render** ⚠️ BAIXO
**Localização:** `components/notifications/notification-item.tsx:164-167`

**Problema:**
```typescript
const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
  addSuffix: true,
  locale: ptBR
});
```

**Impacto:**
- Recalcula "há 2 horas" a cada render
- `formatDistanceToNow` não é barato (parsing de datas)
- Se houver 10 notificações, são 10 cálculos por render

**Solução:**
- Usar `useMemo` para memoizar o cálculo
- Atualizar apenas quando `notification.created_at` mudar
- Considerar atualização periódica (a cada minuto) para "há X minutos"

---

#### 9. **Lógica de Ícone Complexa em Cada Render** ⚠️ BAIXO
**Localização:** `components/notifications/notification-item.tsx:50-154`

**Problema:**
```typescript
const getIcon = (): { Icon: LucideIcon; color: string; bg: string } => {
  // Múltiplas condições if/else
  // Lógica complexa executada a cada render
};
```

**Impacto:**
- Função executada a cada render do componente
- Múltiplas condições avaliadas mesmo quando não mudam
- Overhead desnecessário

**Solução:**
- Memoizar resultado com `useMemo`
- Dependências: `metadata`, `category`, `resource_type`, `title`
- Calcular apenas quando essas props mudarem

---

#### 10. **Falta de Debounce em handleMarkAsRead** ⚠️ BAIXO
**Localização:** `components/home/HomeInboxSection.tsx:69-88`

**Problema:**
- `handleMarkAsRead` é chamado imediatamente ao clicar
- Se usuário clicar rapidamente em várias notificações, múltiplas chamadas

**Solução:**
- Implementar debounce para operações em lote
- Agrupar múltiplas marcações como lidas em uma única chamada
- Usar `startTransition` para atualizações não urgentes

---

### 🟢 **Otimizações Adicionais**

#### 11. **Falta de Índices no Banco de Dados**
**Problema:**
- Queries podem ser lentas sem índices adequados
- `recipient_id`, `read_at`, `created_at` devem ter índices

**Solução:**
- Criar índices compostos:
  ```sql
  CREATE INDEX idx_notifications_recipient_read_created 
  ON notifications(recipient_id, read_at, created_at DESC);
  ```

---

#### 12. **Revalidação Excessiva**
**Localização:** `lib/actions/notifications.ts:162, 188, 246, 399`

**Problema:**
```typescript
revalidatePath("/"); // Revalida TODA a página
```

**Impacto:**
- Revalida toda a home após marcar notificação como lida
- Pode causar re-render de outros componentes

**Solução:**
- Revalidar apenas o caminho específico: `revalidatePath("/home")`
- Ou usar revalidação mais granular

---

#### 13. **Sem Virtualização para Listas Grandes**
**Problema:**
- Se houver muitas notificações, renderiza todas de uma vez
- Pode causar lag em dispositivos móveis

**Solução:**
- Implementar virtualização com `react-window` ou `react-virtuoso`
- Renderizar apenas itens visíveis
- Melhorar performance com 50+ itens

---

## 📈 **Priorização de Melhorias**

### **Prioridade ALTA (Implementar Primeiro):**
1. ✅ Filtrar por workspace no backend (elimina busca de 100 itens)
2. ✅ Consolidar 3 queries em 1 com JOINs (reduz latência)
3. ✅ Buscar workspace_id via relacionamento (elimina query extra)
4. ✅ Passar workspaceId para getNotifications (filtragem no servidor)

### **Prioridade MÉDIA:**
5. Implementar cache/Stale-While-Revalidate
6. Paginação real no backend
7. Memoizar NotificationItem
8. Memoizar formatDistanceToNow

### **Prioridade BAIXA:**
9. Memoizar lógica de ícone
10. Debounce em handleMarkAsRead
11. Criar índices no banco
12. Revalidação mais granular
13. Virtualização para listas grandes

---

## 🎯 **Impacto Esperado**

### **Antes das Otimizações:**
- Tempo de carregamento: ~600-1200ms
- Queries ao banco: 3 por carregamento
- Dados transferidos: ~100-300KB (100 notificações)
- Re-renders: Todos os itens a cada mudança

### **Depois das Otimizações (Prioridade ALTA):**
- Tempo de carregamento: ~200-400ms (**-66%**)
- Queries ao banco: 1 por carregamento (**-66%**)
- Dados transferidos: ~10-30KB (**-90%**)
- Re-renders: Apenas itens que mudaram

---

## 🔧 **Próximos Passos**

1. Adicionar parâmetro `workspaceId` em `getNotifications`
2. Refatorar query para usar JOINs (triggering_user, task)
3. Filtrar por workspace no backend
4. Reduzir limit padrão para 20-30
5. Memoizar `NotificationItem` com `React.memo`
6. Memoizar `formatDistanceToNow` com `useMemo`
7. Testar performance antes/depois

---

## 📝 **Exemplo de Refatoração**

### **Antes:**
```typescript
// 3 queries separadas
const notifications = await getNotifications({ limit: 100 });
const users = await getProfiles(triggeringUserIds);
const tasks = await getTasks(taskIds);
// Filtra no frontend
const filtered = notifications.filter(n => n.metadata.workspace_id === workspaceId);
```

### **Depois:**
```typescript
// 1 query com JOINs
const notifications = await getNotifications({ 
  limit: 20,
  workspaceId: activeWorkspaceId 
});
// Já vem filtrado e com relacionamentos incluídos
```

