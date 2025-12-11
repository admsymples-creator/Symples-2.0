# 🔍 Diagnóstico: Ordem Não Está Sendo Salva (Versão 2)

## 📋 Situação Atual

Os logs do console do navegador mostram:
- ✅ `Tarefa ativa salva com sucesso`
- ✅ `Bulk Update salvo com sucesso! X tarefas atualizadas`

**MAS** a ordem não persiste após recarregar a página.

## 🔧 O Que Foi Feito

### 1. **Verificação Pós-Update Melhorada**

Agora o sistema **SEMPRE** verifica no banco de dados se a posição foi realmente salva, mesmo quando a RPC retorna sucesso.

**Antes:**
- Verificava apenas se a RPC retornava erro
- Se a RPC retornava sucesso, assumia que estava tudo OK

**Agora:**
- Verifica **SEMPRE** no banco após a RPC
- Compara a posição esperada com a posição salva
- Retorna erro se não corresponder

### 2. **Logs Detalhados no Servidor**

Os logs agora mostram:
- `[Server Action] ✅ Posição confirmada no banco: X (esperado: Y, diff: Z)`
- `[Server Action] ❌ PROBLEMA CRÍTICO: Posição NÃO foi salva! Esperado: X, Salvo no banco: Y`

### 3. **Script de Diagnóstico**

Criado `supabase/SCRIPT_VERIFICAR_POSICOES_SALVAS.sql` que verifica:
- Últimas atualizações de posição
- Tarefas com posições duplicadas
- Tarefas sem posição
- Distribuição de posições por workspace
- Status das funções RPC (move_task e move_tasks_bulk)
- Políticas RLS

## 🎯 Próximos Passos

### Passo 1: Verificar Logs do Servidor

**IMPORTANTE:** Os logs `[Server Action]` aparecem no **terminal do servidor Next.js**, não no console do navegador.

1. Abra o terminal onde o Next.js está rodando
2. Arraste uma tarefa
3. Procure por estas mensagens:

**✅ Se estiver funcionando:**
```
[Server Action] ✅ RPC move_task confirmou atualização: {...}
[Server Action] ✅ Posição confirmada no banco: 5000 (esperado: 5000, diff: 0)
```

**❌ Se houver problema:**
```
[Server Action] ❌ PROBLEMA CRÍTICO: Posição NÃO foi salva! Esperado: 5000, Salvo no banco: 2000
```

### Passo 2: Executar Script de Diagnóstico

Execute no Supabase SQL Editor:

```sql
-- Execute: supabase/SCRIPT_VERIFICAR_POSICOES_SALVAS.sql
```

Este script vai mostrar:
- Se as posições estão sendo atualizadas
- Se há tarefas com posições duplicadas
- Se as funções RPC estão configuradas corretamente

### Passo 3: Verificar Função RPC

Execute no Supabase SQL Editor:

```sql
-- Execute: supabase/SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql
```

Este script vai:
- Verificar se a função retorna `JSONB` (correto) ou `VOID` (antigo)
- Atualizar automaticamente se necessário

### Passo 4: Testar Diretamente no Banco

Execute no Supabase SQL Editor (substitua os valores pelos seus):

```sql
-- Substitua v_test_task_id pelo ID de uma tarefa real
-- Substitua v_test_position por uma posição de teste (ex: 9999.0)

DO $$
DECLARE
    v_test_task_id UUID := '48a5ef3a-d023-4055-884a-a77631fb3b61'; -- SUBSTITUA
    v_test_position DOUBLE PRECISION := 9999.0; -- SUBSTITUA
    v_result JSONB;
    v_old_position DOUBLE PRECISION;
    v_new_position DOUBLE PRECISION;
BEGIN
    -- Buscar posição atual
    SELECT position INTO v_old_position
    FROM public.tasks
    WHERE id = v_test_task_id;
    
    RAISE NOTICE 'Posição ANTES: %', v_old_position;
    
    -- Chamar a função
    SELECT public.move_task(v_test_task_id, v_test_position) INTO v_result;
    
    RAISE NOTICE 'Resultado da RPC: %', v_result;
    
    -- Verificar posição depois
    SELECT position INTO v_new_position
    FROM public.tasks
    WHERE id = v_test_task_id;
    
    RAISE NOTICE 'Posição DEPOIS: %', v_new_position;
    
    IF v_new_position = v_test_position THEN
        RAISE NOTICE '✅ SUCESSO: Posição foi atualizada corretamente!';
    ELSE
        RAISE WARNING '❌ ERRO: Posição NÃO foi atualizada! Esperado: %, Atual: %', v_test_position, v_new_position;
    END IF;
END $$;
```

## 🔍 Possíveis Causas

### 1. **Função RPC Retorna VOID (Versão Antiga)**

**Sintoma:** Logs mostram `⚠️ RPC move_task retornou null/undefined`

**Solução:** Execute `SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql`

### 2. **RLS Bloqueando Updates**

**Sintoma:** RPC retorna sucesso, mas posição não muda no banco

**Solução:** Verifique as políticas RLS com o script de diagnóstico

### 3. **Cache do PostgREST Desatualizado**

**Sintoma:** Erro "Could not find the function"

**Solução:** Execute `SCRIPT_REFRESH_TODAS_RPCS.sql` e aguarde 10-30 segundos

### 4. **Problema na Lógica da RPC**

**Sintoma:** RPC retorna sucesso, mas `rows_affected = 0`

**Solução:** Verifique os logs da RPC e execute o teste direto no banco

## 📊 O Que Procurar nos Logs

### ✅ Logs Normais (Funcionando):

**Console do Navegador:**
```
✅ [handleDragEnd] Tarefa ativa salva com sucesso: {taskId: "...", newPosition: 5000}
✅ Bulk Update salvo com sucesso! 4 tarefas atualizadas.
```

**Terminal do Servidor:**
```
[Server Action] ✅ RPC move_task confirmou atualização: {taskId: "...", oldPosition: 2000, newPosition: 5000, rowsAffected: 1}
[Server Action] ✅ Posição confirmada no banco: 5000 (esperado: 5000, diff: 0)
```

### ❌ Logs com Problema:

**Terminal do Servidor:**
```
[Server Action] ❌ PROBLEMA CRÍTICO: Posição NÃO foi salva! Esperado: 5000, Salvo no banco: 2000
```

## 💡 Dica Final

Se os logs do servidor mostrarem que a posição **NÃO** está sendo salva, mesmo com a RPC retornando sucesso, o problema está na **função RPC do banco**. Nesse caso:

1. Execute o teste direto no banco (Passo 4)
2. Verifique os logs do Supabase (se disponível)
3. Revise a lógica da função `move_task` no script de criação


