# Correção de Problemas: Workspace Pessoal e Home

## Problemas Identificados

### Alta Prioridade
1. **Workspace "Pessoal" carrega e cria tarefas**: Contraria a regra "workspace pessoal não tem tarefas"
   - `HomeTasksSection.tsx` (linhas 112-126, 421-425)

### Média Prioridade
2. **Home mostra "Visão por Workspace" agregada**: Deve mostrar apenas workspace ativo
   - `app/(main)/home/page.tsx` (linha 54-85)
3. **WorkspaceCard navega para `/[workspace]/tasks`**: Deve usar rota relativa
   - `components/home/WorkspaceCard.tsx` (linha 59)
4. **Deep link perde contexto**: `/[workspaceSlug]/home` redireciona antes do sync
   - `components/layout/WorkspaceUrlSync.tsx` (linha 31)

### Baixa Prioridade
5. **Caixa de entrada não filtra por workspace**: Mistura contextos
   - `components/home/HomeInboxSection.tsx` (linha 15)

## Soluções

### 1. Bloquear Workspace Pessoal em HomeTasksSection

**Arquivo**: `components/home/HomeTasksSection.tsx`

**Mudanças**:
- Se `currentWorkspace.isPersonal === true`, não carregar tarefas (retornar early)
- Se `currentWorkspace.isPersonal === true`, não renderizar `QuickTaskAdd`
- Mostrar mensagem informativa: "Workspace pessoal não possui tarefas. Use workspaces profissionais para gerenciar tarefas."

**Código**:
```typescript
// No useEffect de loadTasks (linha ~112)
if (currentWorkspace.isPersonal) {
  setTasks([]);
  setLoading(false);
  return; // Early return - workspace pessoal não tem tarefas
}

// No render (linha ~414)
{!currentWorkspace?.isPersonal && (
  <QuickTaskAdd ... />
)}
```

### 2. Filtrar "Visão por Workspace" na Home

**Arquivo**: `app/(main)/home/page.tsx`

**Mudanças**:
- Converter para Client Component para acessar `useWorkspace()`
- Filtrar `workspaceStats` para mostrar apenas o workspace ativo
- Se workspace ativo for "Pessoal", não mostrar a seção "Visão por Workspace"
- Alternativa: Remover completamente a seção se não for necessária

**Opção A - Filtrar por workspace ativo**:
```typescript
"use client";
// ... imports
import { useWorkspace } from "@/components/providers/SidebarProvider";

export default function HomePage() {
  const { activeWorkspaceId } = useWorkspace();
  // ... buscar dados
  
  // Filtrar stats para workspace ativo (exceto pessoal)
  const filteredStats = workspaceStats.filter(
    ws => ws.id === activeWorkspaceId && ws.name !== "Pessoal"
  );
  
  // Renderizar apenas se houver stats filtrados
  {filteredStats.length > 0 && (
    <div>...</div>
  )}
}
```

**Opção B - Remover seção completamente**:
- Remover a seção "Visão por Workspace" (linhas 54-85)

### 3. Corrigir Navegação do WorkspaceCard

**Arquivo**: `components/home/WorkspaceCard.tsx`

**Mudanças**:
- Alterar `router.push(\`/${workspaceBase}/tasks\`)` para `router.push("/tasks")`
- O workspace já será atualizado via `setActiveWorkspaceId(id)`
- A página `/tasks` já detecta o workspace ativo do contexto

**Código**:
```typescript
const handleCardClick = () => {
  setActiveWorkspaceId(id);
  router.push("/tasks"); // Rota relativa, não workspace-específica
};
```

### 4. Corrigir Deep Link para /home

**Arquivo**: `components/layout/WorkspaceUrlSync.tsx`

**Mudanças**:
- Adicionar suporte para detectar workspace em rotas como `/[workspaceSlug]/home`
- Atualizar `nonWorkspaceRoutes` para não incluir "home" quando há workspace na URL
- Garantir que o sync aconteça antes de qualquer redirecionamento

**Código**:
```typescript
const urlWorkspace = useMemo(() => {
  if (!isLoaded) return null;
  
  const segments = pathname.split("/").filter(Boolean);
  
  // Se não há segmentos, não há workspace na URL
  if (segments.length === 0) return null;
  
  // Se o primeiro segmento é uma rota sem workspace, verificar se há workspace no segundo
  const nonWorkspaceRoutes = new Set(["settings", "assistant", "team", "planner", "finance", "tasks"]);
  
  // Caso especial: /home pode estar em /[workspaceSlug]/home
  if (segments[0] === "home" && segments.length === 1) {
    return null; // /home sem workspace
  }
  
  // Se primeiro segmento não é rota conhecida, é workspace slug
  if (!nonWorkspaceRoutes.has(segments[0])) {
    const urlWorkspaceSlug = segments[0];
    return workspaces.find(
      (w) => w.slug === urlWorkspaceSlug || w.id === urlWorkspaceSlug
    ) || null;
  }
  
  return null;
}, [pathname, workspaces, isLoaded]);
```

### 5. Filtrar Notificações por Workspace

**Arquivo**: `components/home/HomeInboxSection.tsx`

**Mudanças**:
- Adicionar `useWorkspace()` para obter `activeWorkspaceId`
- Passar `workspaceId` para `getNotifications()` se disponível
- Atualizar `getNotifications()` em `lib/actions/notifications.ts` para aceitar `workspaceId` opcional

**Código**:
```typescript
// HomeInboxSection.tsx
const { activeWorkspaceId } = useWorkspace();

useEffect(() => {
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const fetchedNotifications = await getNotifications({ 
        limit: 100,
        workspaceId: activeWorkspaceId || undefined // Filtrar por workspace
      });
      setNotifications(fetchedNotifications || []);
    } catch (error) {
      // ...
    }
  };
  loadNotifications();
}, [activeWorkspaceId]);

// lib/actions/notifications.ts
export async function getNotifications(
  filters?: {
    category?: NotificationCategory;
    unreadOnly?: boolean;
    limit?: number;
    workspaceId?: string; // Novo filtro
  }
): Promise<NotificationWithActor[]> {
  // ... código existente ...
  
  // Adicionar filtro por workspace se fornecido
  if (filters?.workspaceId) {
    query = query.eq("metadata->>workspace_id", filters.workspaceId);
  }
  
  // ...
}
```

## Ordem de Implementação

1. ✅ **Alta**: Bloquear workspace pessoal em HomeTasksSection
2. ✅ **Média**: Corrigir navegação do WorkspaceCard
3. ✅ **Média**: Filtrar "Visão por Workspace" na Home
4. ✅ **Média**: Corrigir deep link sync
5. ✅ **Baixa**: Filtrar notificações por workspace

## Notas

- Workspace "Pessoal" é apenas para reunir informações de todos os workspaces, não para criar tarefas
- A Home deve ser context-aware do workspace ativo
- Rotas devem ser relativas quando possível para manter contexto

