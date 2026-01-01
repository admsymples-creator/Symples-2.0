# Análise de Timezone no Sistema

## Problemas Identificados

### 1. **DayColumn - Criação de Tarefas** ✅ CORRIGIDO
**Arquivo**: `components/home/DayColumn.tsx` (linha ~152-159)

**Problema Original**:
```typescript
} else if (dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);  // ❌ Timezone local
  dueDateISO = d.toISOString();  // ❌ Converte para UTC, pode mudar dia
}
```

**Correção Necessária**: Garantir que datas sem hora sejam criadas de forma que ao converter para ISO mantenham o dia correto.

### 2. **formatDateDisplay - Exibição Forçando UTC** ⚠️ POSSÍVEL PROBLEMA
**Arquivo**: `lib/utils.ts` (linha ~8-19)

**Código Atual**:
```typescript
export function formatDateDisplay(dateString: string | Date | null | undefined): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  // Força leitura em UTC para evitar deslocamentos locais (ex.: GMT-3)
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",  // ⚠️ Força UTC
  }).format(date)
}
```

**Análise**: Se as datas no banco estão em UTC (correto), mas queremos exibir no timezone local, isso pode estar causando problemas. Se o banco armazena timestamptz corretamente, o Supabase já converte para o timezone do servidor/cliente.

### 3. **TaskDateTimePicker - Manipulação de Datas**
**Arquivo**: `components/tasks/pickers/TaskDateTimePicker.tsx`

**Análise**: 
- Usa `setHours()` no timezone local - ✅ Correto para input do usuário
- Passa Date object para o pai - ✅ Correto
- O pai converte com `toISOString()` - ⚠️ Pode causar problemas se não for tratado

### 4. **getDayTasks / getWeekTasks - Range de Datas**
**Arquivo**: `lib/actions/dashboard.ts`

**Código Atual**:
```typescript
const startOfDay = new Date(date);
startOfDay.setHours(0, 0, 0, 0);  // Timezone local do servidor

const endOfDay = new Date(date);
endOfDay.setHours(23, 59, 59, 999);  // Timezone local do servidor

const startISO = startOfDay.toISOString();  // Converte para UTC
const endISO = endOfDay.toISOString();  // Converte para UTC
```

**Problema**: Se o servidor está em UTC mas a data vem do cliente (que pode estar em GMT-3), isso pode causar problemas.

### 5. **FullCalendar - Exibição**
**Arquivo**: `components/calendar/planner-calendar.tsx`

**Status**: ✅ Removido `timeZone="local"` explícito (FullCalendar v6 usa local por padrão)

## Estratégia Recomendada

### Padrão: Armazenar em UTC, Exibir em Local

1. **Armazenamento (Banco de Dados)**:
   - ✅ Supabase `timestamptz` já armazena em UTC
   - ✅ Sempre enviar ISO strings para o banco

2. **Criação de Datas no Cliente**:
   - Para datas SEM hora: Criar data local às 12:00 (meio-dia) antes de converter para ISO
   - Para datas COM hora: Usar hora local direto, converter para ISO
   - Exemplo correto:
     ```typescript
     const d = new Date(dateObj);
     d.setHours(12, 0, 0, 0);  // Meio-dia local
     dueDateISO = d.toISOString();  // Converte para UTC mantendo dia
     ```

3. **Exibição**:
   - Não forçar UTC na formatação
   - Deixar o navegador usar timezone local automaticamente
   - Exemplo:
     ```typescript
     return new Intl.DateTimeFormat("pt-BR", {
       day: "numeric",
       month: "short",
       // Sem timeZone: usa local automaticamente
     }).format(date)
     ```

4. **Queries no Servidor**:
   - Quando criar ranges, considerar que as datas do cliente podem estar em timezone diferente
   - Se possível, trabalhar com datas em UTC sempre no servidor

## Arquivos que Precisam de Correção

### Prioridade Alta:
1. ✅ `components/home/DayColumn.tsx` - Criação de tarefas (já corrigido usando meio-dia)
2. ⚠️ `lib/utils.ts` - formatDateDisplay (remover timeZone: "UTC")
3. ⚠️ `lib/actions/dashboard.ts` - getDayTasks/getWeekTasks (verificar conversões)

### Prioridade Média:
4. `components/tasks/pickers/TaskDateTimePicker.tsx` - Verificar se está consistente
5. `app/api/ai/chat/route.ts` - Já usa T12:00:00 (correto!)

### Prioridade Baixa:
6. Outros lugares que usam `setHours(0,0,0,0)` + `toISOString()`

