# 🔧 Resolver Erro: "Could not find the function public.move_task"

## ❌ Erro

```
Falha ao salvar posição (item ativo): "Falha ao mover tarefa: Could not find the function public.move_task(p_new_position, p_task_id) in the schema cache"
```

## 🔍 Causa

O erro pode ter duas causas:

1. **Cache do Schema desatualizado**: A função existe, mas o PostgREST (API do Supabase) ainda não atualizou o cache do schema
2. **Função não criada**: A função RPC `move_task` não foi criada no banco de dados do Supabase

**Se você já executou o script e a função existe** (como mostrado na query), o problema é cache. Veja a seção "Problema de Cache" abaixo.

## ✅ Solução

### Passo 1: Executar o Script SQL

1. Abra o **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Execute o arquivo: `supabase/SCRIPT_CRIAR_MOVE_TASK.sql`

Ou copie e cole este código:

```sql
-- Remover função existente se houver
DROP FUNCTION IF EXISTS public.move_task(UUID, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.move_task(DOUBLE PRECISION, UUID);

-- Criar função move_task
CREATE OR REPLACE FUNCTION public.move_task(
    p_task_id UUID,
    p_new_position DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
    v_current_user_id UUID;
    v_is_member BOOLEAN;
BEGIN
    -- Obter usuário atual
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Obter workspace_id da tarefa
    SELECT workspace_id INTO v_workspace_id
    FROM public.tasks
    WHERE id = p_task_id;
    
    IF v_workspace_id IS NULL THEN
        -- Verificar se é tarefa pessoal
        SELECT EXISTS (
            SELECT 1
            FROM public.tasks
            WHERE id = p_task_id
            AND (workspace_id IS NULL AND is_personal = true AND created_by = v_current_user_id)
            OR assignee_id = v_current_user_id
        ) INTO v_is_member;
        
        IF NOT v_is_member THEN
            RAISE EXCEPTION 'Tarefa não encontrada ou sem workspace_id';
        END IF;
    ELSE
        -- Verificar se o usuário é membro do workspace
        SELECT EXISTS (
            SELECT 1
            FROM public.workspace_members
            WHERE workspace_id = v_workspace_id
            AND user_id = v_current_user_id
        ) INTO v_is_member;
        
        -- Se não for membro, verificar se é tarefa pessoal ou assignee
        IF NOT v_is_member THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.tasks
                WHERE id = p_task_id
                AND (workspace_id IS NULL AND is_personal = true AND created_by = v_current_user_id)
                OR assignee_id = v_current_user_id
            ) INTO v_is_member;
        END IF;
    END IF;
    
    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Usuário não tem permissão para mover esta tarefa';
    END IF;
    
    -- Atualizar a posição
    UPDATE public.tasks
    SET position = p_new_position,
        updated_at = NOW()
    WHERE id = p_task_id;
    
    -- Verificar se a atualização foi bem-sucedida
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Falha ao atualizar posição da tarefa';
    END IF;
    
    RAISE NOTICE 'Tarefa % movida para posição %', p_task_id, p_new_position;
    
END;
$$;

-- Garantir que a função está acessível
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO anon;
```

### Passo 2: Verificar se a Função Foi Criada

Execute este query para verificar:

```sql
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_task'
AND routine_type = 'FUNCTION';
```

**Resultado esperado:** Deve retornar uma linha com `routine_name = 'move_task'`

### Passo 3: Forçar Refresh do Cache (se a função já existe)

Se a função já existe mas ainda dá erro, execute:

```sql
-- Execute o script: supabase/SCRIPT_REFRESH_SCHEMA_CACHE.sql
```

Ou recrie a função manualmente para forçar o refresh:

```sql
DROP FUNCTION IF EXISTS public.move_task(UUID, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.move_task(
    p_task_id UUID,
    p_new_position DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- ... (código completo da função)
$$;

GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_task(UUID, DOUBLE PRECISION) TO anon;
```

**Aguarde 10-30 segundos** após executar para o PostgREST atualizar o cache.

### Passo 4: Testar

1. Aguarde 10-30 segundos após executar o script
2. Recarregue a página de tarefas (Ctrl+F5 ou Cmd+Shift+R)
3. Tente arrastar uma tarefa
4. O erro não deve mais aparecer

## 🔄 Fallback Implementado

O código agora tem um **fallback automático**: se a RPC não existir, ele tenta fazer um update direto. Isso pode falhar por RLS, mas pelo menos não quebra completamente.

**Nota:** O fallback é temporário. Execute o script SQL para ter a solução completa.

## 📝 Arquivos Relacionados

- `supabase/SCRIPT_CRIAR_MOVE_TASK.sql` - Script para criar a função
- `supabase/migrations/20250101_create_move_task_rpc.sql` - Migração original
- `lib/actions/tasks.ts` - Código que chama a RPC (com fallback)

## 🐛 Troubleshooting

### Erro: "permission denied"

**Causa:** Você não tem permissão para criar funções.

**Solução:** Certifique-se de estar logado como owner/admin do projeto Supabase.

### Erro: "function already exists"

**Causa:** A função já existe com assinatura diferente.

**Solução:** O script já remove funções existentes antes de criar. Se persistir, execute manualmente:
```sql
DROP FUNCTION IF EXISTS public.move_task CASCADE;
```
E depois execute o script novamente.

### A função existe mas ainda dá erro (Problema de Cache)

**Causa:** Cache do PostgREST (API do Supabase) desatualizado.

**Sintomas:**
- A função aparece na query `information_schema.routines`
- Mas o erro diz "Could not find the function"
- O erro mostra parâmetros na ordem errada: `(p_new_position, p_task_id)`

**Solução:**
1. Execute o script `supabase/SCRIPT_REFRESH_SCHEMA_CACHE.sql`
2. **Aguarde 10-30 segundos** (o PostgREST precisa atualizar o cache)
3. Recarregue a página com **hard refresh** (Ctrl+F5 ou Cmd+Shift+R)
4. Se persistir:
   - Verifique se está usando o projeto correto (PROD vs PREVIEW)
   - Tente reiniciar o projeto Supabase (se tiver acesso)
   - Aguarde mais alguns minutos e tente novamente

**Nota:** O PostgREST atualiza o schema cache automaticamente, mas pode levar alguns segundos após criar/modificar funções.

