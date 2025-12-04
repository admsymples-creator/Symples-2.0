# 🔍 Como Verificar os Logs do Servidor

## 📋 Problema

Os logs no console do navegador mostram sucesso, mas a ordem não está sendo salva. Isso significa que precisamos verificar os **logs do servidor** (terminal do Next.js) para ver o que realmente está acontecendo.

## 🖥️ Onde Ver os Logs do Servidor

### Se estiver rodando localmente:

1. **Abra o terminal onde o Next.js está rodando**
   - Geralmente é onde você executou `npm run dev` ou `next dev`
   
2. **Procure por estas mensagens:**
   ```
   [Server Action] Chamando RPC move_task: {...}
   [Server Action] 📥 Resposta da RPC move_task: {...}
   [Server Action] ✅ RPC move_task confirmou atualização: {...}
   ```

3. **Se aparecer:**
   - `⚠️ RPC move_task retornou resultado sem campo 'success'` → Função está usando versão antiga (VOID)
   - `❌ RPC move_task retornou erro` → Há um erro específico
   - `✅ RPC move_task confirmou atualização` → Função está funcionando

### Se estiver em produção (Vercel):

1. Vá para o **Vercel Dashboard**
2. Selecione seu projeto
3. Vá para a aba **Functions** ou **Logs**
4. Procure pelos logs de Server Actions

## 🔧 Verificar se a Função Está Usando Versão Correta

Execute este script no Supabase:

```sql
-- Execute: supabase/SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql
```

Este script vai:
1. Verificar se a função retorna `VOID` (antiga) ou `JSONB` (nova)
2. Atualizar automaticamente se necessário
3. Mostrar o status final

## 📊 O Que Procurar nos Logs

### ✅ Logs Normais (Funcionando):

```
[Server Action] Chamando RPC move_task: {taskId: "...", newPosition: 7000}
[Server Action] 📥 Resposta da RPC move_task: {success: true, task_id: "...", old_position: 2000, new_position: 7000, rows_affected: 1}
[Server Action] ✅ RPC move_task confirmou atualização: {...}
```

### ⚠️ Problema Detectado:

```
[Server Action] ⚠️ RPC move_task retornou resultado sem campo 'success'
```
**Solução:** Execute `SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql`

### ❌ Erro Específico:

```
[Server Action] ❌ RPC move_task retornou erro: {success: false, error: "Nenhuma linha foi atualizada"}
```
**Solução:** Problema de RLS ou permissão. Verifique se você é membro do workspace.

## 🎯 Próximos Passos

1. **Execute o script de verificação:**
   ```sql
   -- No Supabase SQL Editor:
   -- Execute: supabase/SCRIPT_VERIFICAR_E_ATUALIZAR_MOVE_TASK.sql
   ```

2. **Aguarde 10-30 segundos** para o cache atualizar

3. **Teste novamente:**
   - Arraste uma tarefa
   - Verifique os logs no **terminal do servidor** (não no console do navegador)

4. **Compartilhe os logs do servidor:**
   - Copie as mensagens que começam com `[Server Action]`
   - Isso vai mostrar exatamente o que está acontecendo

## 💡 Dica

Os logs `[Server Action]` aparecem no **terminal do servidor**, não no console do navegador. Se você não estiver vendo esses logs, verifique:
- Se o servidor Next.js está rodando
- Se está olhando no terminal correto
- Se os logs não estão sendo filtrados


