# Correção de Drag-and-Drop em Tarefas de Projetos

## Problema Identificado

O drag-and-drop (DND) não funcionava quando havia `tagFilter` (tarefas de projetos), mas funcionava corretamente em "Gestão >> Tarefas" (sem filtro de projeto).

### Causa Raiz

Quando há `tagFilter`, o `localTasksRef.current` pode estar vazio ou desatualizado durante o processo de drag-and-drop, causando falhas em:
- Detecção de colisão
- Busca de tarefas durante o drag
- Processamento do drag end

## Correções Implementadas

### 1. `collisionDetectionStrategy` (app/(main)/tasks/tasks-page-client.tsx)

**Problema**: Usava apenas `localTasksRef.current` para criar Set de IDs de tarefas.

**Solução**: 
- Adicionado fallback para `localTasks` quando `localTasksRef.current` está vazio
- Adicionados logs de debug quando `taskIds` está vazio com `tagFilter`
- Dependências atualizadas para incluir `localTasks` e `tagFilter`

```typescript
const collisionDetectionStrategy = useCallback((args: Parameters<typeof pointerWithin>[0]) => {
    // ✅ CORREÇÃO: Usar localTasks como fallback se localTasksRef estiver vazio
    const currentTasks = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
    const taskIds = new Set(currentTasks.map((task) => String(task.id)));
    // ... resto do código
}, [localTasks, tagFilter]);
```

### 2. `handleDragStart` (app/(main)/tasks/tasks-page-client.tsx)

**Problema**: Buscava tarefa apenas em `localTasksRef.current`.

**Solução**:
- Adicionado fallback para `localTasks` quando `localTasksRef.current` está vazio
- Adicionados logs de debug para rastrear quando a tarefa não é encontrada

```typescript
const currentTasks = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
const task = currentTasks.find((t) => String(t.id) === activeIdStr);
```

### 3. `handleDragOver` (app/(main)/tasks/tasks-page-client.tsx)

**Problema**: Usava apenas `localTasksRef.current` para buscar tarefas.

**Solução**:
- Adicionado fallback para `localTasks` quando `localTasksRef.current` está vazio
- Adicionados logs de debug quando a tarefa não é encontrada

```typescript
const current = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
const activeIndex = current.findIndex((t) => String(t.id) === activeIdStr);
```

### 4. `handleDragEnd` (app/(main)/tasks/tasks-page-client.tsx)

**Problema**: Usava apenas `localTasksRef.current` para buscar tarefas e criar rollback state.

**Solução**:
- Adicionado fallback para `localTasks` em múltiplos pontos
- `rollbackState` também usa o fallback correto
- `localTasksRef` sempre atualizado após o drag para manter sincronização

### 5. `groupedDataRef` (app/(main)/tasks/tasks-page-client.tsx)

**Problema**: Atualizado diretamente, causando problemas de timing.

**Solução**:
- Atualizado via `useEffect` para garantir sincronização quando `groupedData` ou `tagFilter` mudam
- Adicionados logs de debug para rastrear atualizações

```typescript
useEffect(() => {
    groupedDataRef.current = groupedData;
    if (process.env.NODE_ENV === 'development' && tagFilter) {
        console.log('🔍 [groupedDataRef] Atualizado:', {
            tagFilter,
            groupedDataKeys: Object.keys(groupedData),
            totalTasks: Object.values(groupedData).reduce((sum, tasks) => sum + tasks.length, 0)
        });
    }
}, [groupedData, tagFilter]);
```

## Arquivos Modificados

- `app/(main)/tasks/tasks-page-client.tsx`
  - `collisionDetectionStrategy` (linha ~443)
  - `handleDragStart` (linha ~2134)
  - `handleDragOver` (linha ~2198)
  - `handleDragEnd` (linha ~2265)
  - `groupedDataRef` sincronização (linha ~1552)
  - `findGroupKeyForId` com logs de debug (linha ~1886)

## Resultado

O drag-and-drop agora funciona corretamente em tarefas de projetos (com `tagFilter`). As correções garantem que:

- ✅ A detecção de colisão funciona mesmo quando `localTasksRef` está vazio
- ✅ O drag start encontra a tarefa corretamente
- ✅ O drag over funciona durante o arraste
- ✅ O drag end processa corretamente a movimentação
- ✅ O rollback funciona corretamente em caso de erro
- ✅ `groupedDataRef` está sincronizado com `groupedData`

## Logs de Debug

Em modo de desenvolvimento, logs detalhados foram adicionados para ajudar a identificar problemas futuros:

- `🔍 [handleDragStart] DEBUG - tagFilter`
- `🔍 [handleDragEnd] DEBUG - tagFilter`
- `🔍 [groupedDataRef] Atualizado`
- `⚠️ [findGroupKeyForId] Tarefa não encontrada`
- `⚠️ [collisionDetectionStrategy] taskIds vazio com tagFilter`

## Data da Correção

31 de Dezembro de 2024

