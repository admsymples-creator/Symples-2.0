---
name: Otimização de Performance - Navegação e Sidebar
overview: "Plano de otimização para eliminar lentidão e \"piscadas\" na navegação do Sidebar, abordando 5 problemas arquiteturais: quebra de persistência do layout, waterfalls bloqueantes, custo de hidratação, gargalos de RLS e falta de feedback otimista."
todos:
  - id: parallelize-layout-calls
    content: Paralelizar getUserProfile() e getUserWorkspaces() no layout.tsx usando Promise.all()
    status: pending
  - id: create-loading-layout
    content: Criar app/(main)/loading.tsx com skeleton para evitar tela branca durante carregamento
    status: pending
  - id: cache-workspaces
    content: Implementar cache de workspaces em lib/actions/user.ts usando unstable_cache do Next.js
    status: pending
  - id: memoize-isactive
    content: Memoizar função isActive() no Sidebar.tsx usando useMemo para evitar recriação a cada render
    status: pending
  - id: optimize-workspace-sync
    content: Otimizar WorkspaceUrlSync.tsx adicionando guards e reduzindo dependências do useEffect
    status: pending
  - id: isolate-searchparams
    content: Isolar useSearchParams em componente separado com Suspense no Sidebar.tsx
    status: pending
  - id: cache-subscription-sidebar
    content: Implementar cache em memória para dados de subscription no Sidebar.tsx com debounce
    status: pending
  - id: optimize-workspaces-query
    content: Otimizar query getUserWorkspaces() verificando índices e considerando RPC function
    status: pending
  - id: add-prefetch-links
    content: Adicionar prefetch={true} explícito nos Links do Sidebar.tsx
    status: pending
  - id: create-page-loading-states
    content: Criar loading.tsx para rotas principais (home, tasks, finance) com skeletons
    status: pending
  - id: workspace-switch-feedback
    content: Adicionar feedback visual (loading state) ao trocar workspace usando startTransition
    status: pending
---

# Plano de

Otimização de Performance - Navegação e Sidebar

## Objetivo

Eliminar latência perceptível e sensação de "peso" ao navegar entre rotas, removendo re-renders desnecessários do Sidebar e otimizando carregamento de dados.---

## 1. Eliminar Waterfalls Bloqueantes no Layout (Alta Prioridade)

### 1.1. Paralelizar Chamadas no Layout

**Arquivo:** `app/(main)/layout.tsx`**Problema:** `getUserProfile()` e `getUserWorkspaces()` são sequenciais, bloqueando renderização.**Solução:** Usar `Promise.all()` para executar em paralelo.

```typescript
// ANTES (sequencial)
const user = await getUserProfile();
const workspaces = await getUserWorkspaces();

// DEPOIS (paralelo)
const [user, workspaces] = await Promise.all([
  getUserProfile(),
  getUserWorkspaces()
]);
```



### 1.2. Adicionar Loading State no Layout

**Arquivo:** `app/(main)/loading.tsx` (criar novo)Criar arquivo `loading.tsx` no diretório `(main)` para mostrar skeleton durante carregamento do layout, evitando tela branca.

### 1.3. Cache de Subscription no Sidebar

**Arquivo:** `components/layout/Sidebar.tsx`**Problema:** `useEffect` faz fetch de subscription a cada mudança de workspace, sem cache.**Solução:**

- Adicionar cache em memória (Map) para dados de subscription
- Debounce de 300ms para evitar múltiplas chamadas
- Usar `useMemo` para calcular `trialDaysRemaining` apenas quando necessário

---

## 2. Otimizar Cálculo de Estado Ativo (Média Prioridade)

### 2.1. Memoizar Função `isActive`

**Arquivo:** `components/layout/Sidebar.tsx`**Problema:** `isActive()` é recriada a cada render e faz parsing de query strings.**Solução:**

- Mover `isActive` para `useMemo` que depende apenas de `pathname` e `searchParams`
- Extrair lógica de parsing para função auxiliar memoizada
- Usar `useCallback` se necessário passar como prop

### 2.2. Otimizar WorkspaceUrlSync

**Arquivo:** `components/layout/WorkspaceUrlSync.tsx`**Problema:** `useEffect` roda a cada mudança de `pathname`, causando atualizações de estado desnecessárias.**Solução:**

- Adicionar guard para evitar atualização se workspace já está correto
- Usar `useMemo` para calcular `urlWorkspace` antes do `useEffect`
- Reduzir dependências do `useEffect` apenas ao necessário

---

## 3. Resolver Quebra de Persistência do Layout (Média Prioridade)

### 3.1. Isolar useSearchParams em Suspense

**Arquivo:** `components/layout/Sidebar.tsx`**Problema:** `useSearchParams()` no `SidebarContent` causa re-renders desnecessários.**Solução:**

- Extrair componente que usa `useSearchParams` para componente separado
- Envolver em `<Suspense>` com fallback mínimo
- Passar `searchParams` como prop memoizada para `isActive`

### 3.2. Estabilizar Referências de Props

**Arquivo:** `components/layout/AppShell.tsx`**Problema:** Props `user` e `workspaces` podem ter referências instáveis.**Solução:**

- Usar `useMemo` no layout para estabilizar objetos `uiUser`
- Garantir que array `workspaces` tenha referência estável

---

## 4. Otimizar Consultas ao Banco (Média-Alta Prioridade)

### 4.1. Adicionar Cache de Workspaces

**Arquivo:** `lib/actions/user.ts`**Problema:** `getUserWorkspaces()` é chamado em toda navegação, mesmo sem mudanças.**Solução:**

- Implementar cache com `unstable_cache` do Next.js (TTL de 5 minutos)
- Invalidar cache apenas quando necessário (ex: novo workspace criado)

### 4.2. Otimizar Query de Workspaces

**Arquivo:** `lib/actions/user.ts`**Problema:** Join com `workspace_members` e transformação no cliente.**Solução:**

- Verificar índices no banco: `workspace_members(user_id)` e `workspaces(id)`
- Considerar RPC function no Supabase para query otimizada
- Adicionar `select` específico para reduzir dados transferidos

### 4.3. Cache de Subscription no Cliente

**Arquivo:** `components/layout/Sidebar.tsx`**Problema:** Fetch de subscription a cada mudança de workspace.**Solução:**

- Usar `SWR` ou `React Query` para cache automático
- Ou implementar cache simples com Map + TTL
- Prefetch subscription ao trocar workspace (hover no dropdown)

---

## 5. Adicionar Feedback Otimista (Baixa-Média Prioridade)

### 5.1. Prefetch Explícito nos Links

**Arquivo:** `components/layout/Sidebar.tsx`**Problema:** Links não têm prefetch explícito.**Solução:**

- Adicionar `prefetch={true}` nos `<Link>` do Sidebar
- Prefetch ao hover (já implementado parcialmente no workspace dropdown)

### 5.2. Loading States nas Páginas

**Arquivos:** Criar `loading.tsx` em rotas principais**Problema:** Ausência de loading states durante navegação.**Solução:**

- Criar `app/(main)/home/loading.tsx`
- Criar `app/(main)/tasks/loading.tsx`
- Criar `app/(main)/finance/loading.tsx`
- Usar skeletons consistentes com design system

### 5.3. Feedback Visual ao Trocar Workspace

**Arquivo:** `components/layout/Sidebar.tsx`**Problema:** `router.push()` sem feedback visual.**Solução:**

- Adicionar estado de loading ao trocar workspace
- Mostrar spinner ou skeleton no conteúdo principal
- Usar `startTransition` do React para navegação não-bloqueante

---

## 6. Melhorias Adicionais de Performance

### 6.1. Lazy Load de Componentes Pesados

**Arquivo:** `components/layout/Sidebar.tsx`**Solução:**

- Lazy load do `GlobalAssistantSheet` se não estiver visível
- Lazy load de imagens de logo dos workspaces

### 6.2. Otimizar Re-renders com React.memo

**Arquivo:** `components/layout/Sidebar.tsx`**Solução:**

- Envolver `NavItemView` com `React.memo`
- Envolver `SidebarContent` com `React.memo` se props forem estáveis

### 6.3. Reduzir Dependências de useEffect

**Arquivo:** `components/layout/Sidebar.tsx`**Solução:**

- Revisar todos os `useEffect` e reduzir dependências ao mínimo
- Usar refs quando possível para valores que não devem trigger re-render

---

## Ordem de Implementação Recomendada

1. **Fase 1 (Impacto Imediato):**

- 1.1 Paralelizar chamadas no layout
- 1.2 Adicionar loading.tsx
- 4.1 Cache de workspaces

2. **Fase 2 (Redução de Re-renders):**

- 2.1 Memoizar função isActive
- 2.2 Otimizar WorkspaceUrlSync
- 3.1 Isolar useSearchParams

3. **Fase 3 (Otimizações Avançadas):**

- 1.3 Cache de subscription
- 4.2 Otimizar query de workspaces
- 4.3 Cache de subscription no cliente

4. **Fase 4 (UX e Polimento):**

- 5.1 Prefetch explícito
- 5.2 Loading states
- 5.3 Feedback visual ao trocar workspace

---

## Métricas de Sucesso

- **Tempo de carregamento inicial:** Redução de 30-50%
- **Tempo de navegação entre rotas:** < 100ms (perceptível como instantâneo)
- **Re-renders do Sidebar:** Redução de 70-80%
- **Chamadas ao banco:** Redução de 60% (via cache)

---

## Notas Técnicas

- Manter compatibilidade com Next.js 15+ App Router