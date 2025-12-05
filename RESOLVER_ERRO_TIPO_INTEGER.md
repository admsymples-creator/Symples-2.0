# 🔧 Resolver Erro: "invalid input syntax for type integer"

## 📋 Problema

O erro indica que a função RPC `move_task` no banco de dados está esperando um parâmetro do tipo `INTEGER`, mas está recebendo um valor decimal (`687.5`) da nova lógica de Midpoint Calculation.

**Erro:**
```
❌ [handleDragEnd] Falha ao salvar posição (item ativo): "Falha ao mover tarefa: invalid input syntax for type integer: \"687.5\""
```

## 🔍 Causa

A função `move_task` no banco de dados foi criada com o parâmetro `p_new_position` como `INTEGER` em vez de `DOUBLE PRECISION`. Isso acontece quando:
- A função foi criada manualmente com tipo errado
- Uma versão antiga da função ainda existe no banco

## ✅ Solução

Execute o script de correção no Supabase SQL Editor:

```sql
-- Execute: supabase/SCRIPT_CORRIGIR_TIPO_POSICAO.sql
```

Este script vai:
1. Verificar o tipo atual do parâmetro
2. Remover a função existente (tanto com INTEGER quanto DOUBLE PRECISION)
3. Recriar a função com o tipo correto (`DOUBLE PRECISION`)
4. Verificar se foi corrigido

## 📝 Passo a Passo

### 1. Abrir Supabase SQL Editor

1. Vá para o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor**

### 2. Executar Script de Correção

1. Copie o conteúdo de `supabase/SCRIPT_CORRIGIR_TIPO_POSICAO.sql`
2. Cole no SQL Editor
3. Clique em **Run** (ou pressione `Ctrl+Enter`)

### 3. Verificar Resultado

O script vai mostrar:
- ✅ `Tipo correto (DOUBLE PRECISION)` - Sucesso!
- ❌ `Tipo incorreto (INTEGER)` - Ainda precisa corrigir

### 4. Aguardar Cache Atualizar

Após executar o script:
- Aguarde **10-30 segundos** para o PostgREST atualizar o schema cache
- Teste novamente arrastando uma tarefa

## 🔄 Alternativa: Usar Script de Verificação

Se preferir, você também pode usar o script de verificação atualizado:

```sql
-- Execute: supabase/SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql
```

Este script agora também remove versões com `INTEGER` antes de criar a nova função.

## 🎯 Verificação Manual

Se quiser verificar manualmente o tipo do parâmetro:

```sql
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'move_task';
```

**Resultado esperado:**
```
function_name | arguments
--------------|------------------------------------------
move_task     | p_task_id uuid, p_new_position double precision
```

Se aparecer `integer` em vez de `double precision`, execute o script de correção.

## 💡 Por Que Isso Aconteceu?

A nova lógica de **Midpoint Calculation** calcula posições decimais (ex: `687.5`) usando a média entre vizinhos. Isso é necessário para:
- Evitar colisões de posição
- Permitir inserções infinitas entre itens
- Reduzir a necessidade de re-indexação

Por isso, o parâmetro precisa ser `DOUBLE PRECISION` e não `INTEGER`.

## ✅ Após Corrigir

Após executar o script e aguardar o cache atualizar, você deve ver nos logs:
- `✅ [handleDragEnd] Tarefa ativa salva com sucesso`
- Posições decimais sendo salvas corretamente (ex: `687.5`, `1250.25`, etc.)


