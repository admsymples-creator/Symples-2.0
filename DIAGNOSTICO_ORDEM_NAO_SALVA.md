# 🔍 Diagnóstico: Ordem das Tarefas Não Está Sendo Salva

## ❌ Sintoma

As funções RPC estão sendo encontradas (sem erro de "function not found"), mas a ordem das tarefas não está persistindo no banco de dados após arrastar.

## 🔍 Possíveis Causas

### 1. Função RPC não está realmente atualizando

**Verificar:**
- Execute o script `supabase/SCRIPT_TESTAR_MOVE_TASK.sql`
- Verifique se a função realmente atualiza a posição no banco

**Solução:**
- Verifique os logs do servidor após arrastar uma tarefa
- Procure por mensagens como `✅ Posição confirmada` ou `⚠️ Posição não corresponde`

### 2. Problema de RLS ainda bloqueando

**Verificar:**
```sql
-- Verificar se o usuário tem permissão
SELECT 
    t.id,
    t.title,
    t.workspace_id,
    t.position,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = t.workspace_id
            AND wm.user_id = auth.uid()
        ) THEN '✅ É membro'
        ELSE '❌ NÃO é membro'
    END as is_member
FROM tasks t
WHERE t.id = 'TASK_ID_AQUI';
```

**Solução:**
- Verifique se você é membro do workspace da tarefa
- A função RPC usa `SECURITY DEFINER`, então deveria contornar RLS, mas pode haver problemas

### 3. Valores de position inválidos

**Verificar:**
- Abra o console do navegador
- Procure por logs: `🚀 Otimizando Bulk Update` ou `[Server Action] Chamando RPC`
- Verifique os valores de `position` sendo enviados

**Solução:**
- Verifique se `position` não é `null`, `undefined` ou `NaN`
- Verifique se `position` é um número válido

### 4. Problema na lógica de cálculo de posição

**Verificar:**
- Veja os logs no console: `📦 Payload preparado`
- Verifique se as posições calculadas fazem sentido

**Solução:**
- As posições devem ser números sequenciais (1000, 2000, 3000, etc.)
- Não devem ser todas iguais ou muito próximas

## 🛠️ Passos de Diagnóstico

### Passo 1: Verificar Logs no Console

1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Arraste uma tarefa
4. Procure por estas mensagens:

```
🚀 Otimizando Bulk Update: Salvando X itens via RPC...
📦 Payload preparado: X itens [...]
[Server Action] Chamando RPC move_task: {...}
[Server Action] ✅ Posição confirmada: ...
```

**O que procurar:**
- ✅ Se aparecer `✅ Posição confirmada`: A função está salvando
- ⚠️ Se aparecer `⚠️ Posição não corresponde`: A função não está salvando corretamente
- ❌ Se aparecer `❌ Erro fatal`: Há um erro na chamada

### Passo 2: Verificar no Banco de Dados

Execute esta query após arrastar uma tarefa:

```sql
-- Verificar posições atuais
SELECT 
    id,
    title,
    position,
    updated_at,
    workspace_id
FROM public.tasks
WHERE workspace_id = 'SEU_WORKSPACE_ID'
ORDER BY position ASC
LIMIT 10;
```

**O que procurar:**
- As posições devem estar em ordem crescente
- `updated_at` deve ter sido atualizado recentemente
- Não deve haver muitas posições iguais

### Passo 3: Testar a Função RPC Diretamente

Execute o script `supabase/SCRIPT_TESTAR_MOVE_TASK.sql`:

1. Pegue o ID de uma tarefa
2. Descomente a seção de teste manual
3. Execute a função diretamente
4. Verifique se a posição foi atualizada

### Passo 4: Verificar Logs do Servidor

Se estiver rodando localmente, verifique os logs do Next.js:

```bash
# Procure por mensagens como:
[Server Action] Chamando RPC move_task
[Server Action] ✅ Posição confirmada
[Server Action] Erro na RPC move_task
```

## 🔧 Soluções por Problema

### Problema: Função RPC não atualiza

**Causa:** A função pode estar retornando sucesso mas não fazendo o UPDATE.

**Solução:**
1. Execute o script `supabase/SCRIPT_REFRESH_SCHEMA_CACHE.sql` novamente
2. Verifique se a função tem `SECURITY DEFINER`
3. Teste a função diretamente no SQL Editor

### Problema: Position sempre 0 ou NULL

**Causa:** Os valores calculados no frontend estão incorretos.

**Solução:**
1. Verifique a lógica de cálculo de posição em `handleDragEnd`
2. Adicione logs para ver os valores calculados
3. Garanta que `position` é sempre um número válido

### Problema: RLS ainda bloqueando

**Causa:** Mesmo com `SECURITY DEFINER`, pode haver problemas.

**Solução:**
1. Verifique se você é membro do workspace
2. Verifique as políticas RLS da tabela tasks
3. Tente executar a função diretamente no SQL Editor como seu usuário

### Problema: Cache do PostgREST

**Causa:** O PostgREST pode estar usando uma versão antiga da função.

**Solução:**
1. Execute `supabase/SCRIPT_REFRESH_TODAS_RPCS.sql`
2. Aguarde 30-60 segundos
3. Recarregue a página com hard refresh

## 📊 Checklist de Verificação

- [ ] Função `move_task` existe no banco
- [ ] Função `move_tasks_bulk` existe no banco
- [ ] Ambas as funções têm `SECURITY DEFINER`
- [ ] Você é membro do workspace das tarefas
- [ ] Os logs mostram que a RPC está sendo chamada
- [ ] Os logs mostram valores de position válidos
- [ ] A query no banco mostra posições atualizadas
- [ ] Não há erros no console do navegador
- [ ] Não há erros nos logs do servidor

## 🎯 Próximos Passos

1. **Execute o diagnóstico:**
   - Abra o console do navegador
   - Arraste uma tarefa
   - Anote todas as mensagens de log

2. **Verifique no banco:**
   - Execute a query de verificação de posições
   - Compare com os valores esperados

3. **Teste a função diretamente:**
   - Execute `SCRIPT_TESTAR_MOVE_TASK.sql`
   - Verifique se a função funciona quando chamada diretamente

4. **Compartilhe os resultados:**
   - Logs do console
   - Resultados das queries
   - Qualquer erro encontrado

## 📝 Arquivos de Ajuda

- `supabase/SCRIPT_TESTAR_MOVE_TASK.sql` - Testar função diretamente
- `supabase/SCRIPT_REFRESH_TODAS_RPCS.sql` - Recriar todas as funções
- `DIAGNOSTICO_ORDEM_TAREFAS.md` - Diagnóstico completo inicial


