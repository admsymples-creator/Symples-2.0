# 🔧 Resolver Erro: "Could not find the function public.move_tasks_bulk"

## ❌ Erro

```
❌ Erro fatal no Bulk Update: "Erro Bulk: Could not find the function public.move_tasks_bulk(p_updates) in the schema cache"
```

## 🔍 Causa

O erro pode ter duas causas:

1. **Cache do Schema desatualizado**: A função existe, mas o PostgREST (API do Supabase) ainda não atualizou o cache do schema
2. **Função não criada**: A função RPC `move_tasks_bulk` não foi criada no banco de dados do Supabase

**Se você já executou a migração e a função existe** (verifique com a query abaixo), o problema é cache. Veja a seção "Problema de Cache" abaixo.

## ✅ Solução

### Passo 1: Verificar se a Função Existe

Execute esta query no SQL Editor do Supabase:

```sql
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'move_tasks_bulk'
AND routine_type = 'FUNCTION';
```

**Se retornar uma linha:** A função existe, o problema é cache. Vá para o Passo 2.

**Se não retornar nada:** A função não existe. Vá para o Passo 3.

### Passo 2: Forçar Refresh do Cache (se a função já existe)

Execute o script:

```sql
-- Execute o arquivo: supabase/SCRIPT_REFRESH_BULK_CACHE.sql
```

Ou recrie a função manualmente:

```sql
DROP FUNCTION IF EXISTS public.move_tasks_bulk(JSONB);

CREATE OR REPLACE FUNCTION public.move_tasks_bulk(
    p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- ... (código completo da função - veja supabase/migrations/20250101_create_move_tasks_bulk_rpc.sql)
$$;

GRANT EXECUTE ON FUNCTION public.move_tasks_bulk(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_tasks_bulk(JSONB) TO anon;
```

**Aguarde 10-30 segundos** após executar para o PostgREST atualizar o cache.

### Passo 3: Criar a Função (se não existe)

Execute a migração:

```sql
-- Execute o arquivo: supabase/migrations/20250101_create_move_tasks_bulk_rpc.sql
```

Ou execute o script de refresh que também cria a função:

```sql
-- Execute o arquivo: supabase/SCRIPT_REFRESH_BULK_CACHE.sql
```

### Passo 4: Testar

1. Aguarde 10-30 segundos após executar o script
2. Recarregue a página de tarefas com **hard refresh** (Ctrl+F5 ou Cmd+Shift+R)
3. Tente arrastar múltiplas tarefas (que afetam outras tarefas)
4. O erro não deve mais aparecer

## 🔄 Fallback Implementado

O código agora tem um **fallback automático**: se a RPC não existir ou houver problema de cache, ele tenta fazer updates individuais. Isso pode falhar por RLS, mas pelo menos não quebra completamente.

**Nota:** O fallback é temporário. Execute o script SQL para ter a solução completa.

## 📝 Arquivos Relacionados

- `supabase/SCRIPT_REFRESH_BULK_CACHE.sql` - Script para criar/recriar a função e forçar refresh
- `supabase/migrations/20250101_create_move_tasks_bulk_rpc.sql` - Migração original
- `lib/actions/tasks.ts` - Código que chama a RPC (com fallback)

## 🐛 Troubleshooting

### Erro: "permission denied"

**Causa:** Você não tem permissão para criar funções.

**Solução:** Certifique-se de estar logado como owner/admin do projeto Supabase.

### Erro: "function already exists"

**Causa:** A função já existe com assinatura diferente.

**Solução:** O script já remove funções existentes antes de criar. Se persistir, execute manualmente:
```sql
DROP FUNCTION IF EXISTS public.move_tasks_bulk CASCADE;
```
E depois execute o script novamente.

### A função existe mas ainda dá erro (Problema de Cache)

**Causa:** Cache do PostgREST (API do Supabase) desatualizado.

**Sintomas:**
- A função aparece na query `information_schema.routines`
- Mas o erro diz "Could not find the function"
- O erro menciona "schema cache"

**Solução:**
1. Execute o script `supabase/SCRIPT_REFRESH_BULK_CACHE.sql`
2. **Aguarde 10-30 segundos** (o PostgREST precisa atualizar o cache)
3. Recarregue a página com **hard refresh** (Ctrl+F5 ou Cmd+Shift+R)
4. Se persistir:
   - Verifique se está usando o projeto correto (PROD vs PREVIEW)
   - Tente reiniciar o projeto Supabase (se tiver acesso)
   - Aguarde mais alguns minutos e tente novamente

**Nota:** O PostgREST atualiza o schema cache automaticamente, mas pode levar alguns segundos após criar/modificar funções.

### Erro persiste mesmo após refresh

**Solução:**
1. Execute ambos os scripts:
   - `supabase/SCRIPT_REFRESH_SCHEMA_CACHE.sql` (para move_task)
   - `supabase/SCRIPT_REFRESH_BULK_CACHE.sql` (para move_tasks_bulk)
2. Aguarde 30-60 segundos
3. Limpe o cache do navegador
4. Recarregue a página


