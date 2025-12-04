# 🐛 DIAGNÓSTICO: Loop de Renderização no TaskList

## 📋 PROBLEMA IDENTIFICADO

O componente `TaskList.tsx` está em loop infinito de renderização devido a múltiplos problemas que se reforçam mutuamente:

---

## 🔍 CAUSA RAIZ #1: useEffect de Sincronização no page.tsx

**Localização:** `app/(main)/tasks/page.tsx` - Linhas 125-131

```typescript
useEffect(() => {
    if (prevTasksRef.current !== tasksFromHook) {
        prevTasksRef.current = tasksFromHook;
        setLocalTasks(tasksFromHook);
    }
}, [tasksFromHook]);
```

### 🚫 Por que causa re-render:

1. **`tasksFromHook` muda de referência a cada render** - O hook `useTasks` retorna um novo array mesmo quando os dados são os mesmos
2. **Comparação de referência sempre retorna `true`** - `prevTasksRef.current !== tasksFromHook` sempre será verdadeiro
3. **`setLocalTasks` dispara re-render** - Atualiza o estado, causando re-render do componente pai
4. **Ciclo se repete** - Novo render → nova referência → novo `setLocalTasks` → loop infinito

### 🔧 Como fixar:

Usar comparação profunda baseada em IDs das tarefas ao invés de comparação de referência.

---

## 🔍 CAUSA RAIZ #2: Props sendo recriadas sem memoização

**Localização:** `app/(main)/tasks/page.tsx` - Múltiplas linhas

### 🚫 Por que causa re-render:

1. **Arrays sendo recriados** - `localTasks`, `availableGroups`, `workspaceMembers` são passados como props sem memoização
2. **Callbacks não memoizados** - Alguns handlers são recriados a cada render
3. **Objetos inline** - Objetos criados inline no JSX causam re-renders nos componentes filhos

### 🔧 Como fixar:

Memoizar arrays e objetos antes de passar como props usando `useMemo`.

---

## 🔍 CAUSA RAIZ #3: Sensores do dnd-kit recriados

**Localização:** `app/(main)/tasks/page.tsx` - Linhas 134-143

```typescript
const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

### 🚫 Por que causa re-render:

Embora `useSensors` já memoize internamente, se o componente pai re-renderiza constantemente, os sensores são recriados, causando re-renders no `DndContext`.

### 🔧 Como fixar:

`useSensors` já memoiza automaticamente, mas precisamos garantir que o componente pai não re-rendere desnecessariamente.

---

## 🔍 CAUSA RAIZ #4: Revalidação de Path

**Localização:** `lib/actions/tasks.ts` e outros arquivos de server actions

### 🚫 Por que causa re-render:

1. **`revalidatePath("/tasks")`** - Várias server actions chamam `revalidatePath`, forçando re-render do servidor
2. **`router.refresh()`** - Alguns componentes chamam `router.refresh()` que recarrega a página

### 🔧 Como fixar:

Remover ou comentar `revalidatePath` desnecessários, já que estamos usando Optimistic UI.

---

## 📊 FLUXO DO LOOP INFINITO

```
1. Componente pai renderiza
   ↓
2. useTasks retorna tasksFromHook (nova referência)
   ↓
3. useEffect detecta mudança (sempre verdadeiro)
   ↓
4. setLocalTasks atualiza estado
   ↓
5. Componente pai re-renderiza (volta para passo 1)
   ↓
   [LOOP INFINITO]
```

---

## ✅ SOLUÇÕES IMPLEMENTADAS

### 1. ✅ TaskList.tsx - Single Source of Truth

- ✅ `initialTasks` usado APENAS no `useState` inicial
- ✅ Função inicializadora com `structuredClone` para isolamento
- ✅ `handleDragEnd` usa `useCallback([])` com functional update
- ✅ Sensores já memoizados por definição (`useSensors`)
- ✅ Nenhuma leitura de `initialTasks` após o mount

### 2. 🔄 page.tsx - Correções Necessárias

- 🔄 Substituir comparação de referência por comparação profunda baseada em IDs
- 🔄 Memoizar arrays antes de passar como props
- 🔄 Garantir que callbacks sejam memoizados

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ TaskList.tsx refatorado
2. 🔄 Corrigir useEffect de sincronização no page.tsx
3. 🔄 Memoizar arrays e objetos
4. 🔄 Verificar e remover revalidatePath desnecessários




