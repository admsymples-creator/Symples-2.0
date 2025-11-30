# ✅ Verificação: Tabela task_comments

## Status Atual

- ✅ **PROD**: Tabela `task_comments` existe e está visível
- ⚠️ **DEV**: Precisa verificar se a tabela existe

## Como Verificar no DEV

### Opção 1: Buscar na Lista

1. No **Supabase Dashboard DEV**
2. Vá em **Table Editor**
3. Use a barra de busca: digite `task_comments`
4. Se aparecer, a tabela existe ✅

### Opção 2: Verificar via SQL

Execute este SQL no **SQL Editor do DEV**:

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'task_comments';
```

**Resultado esperado:**
- Se retornar `task_comments` → Tabela existe ✅
- Se não retornar nada → Tabela não existe ❌

## Se a Tabela Não Existir no DEV

Execute novamente o script de migração:

1. No **Supabase Dashboard DEV**
2. Vá em **SQL Editor** → **New Query**
3. Cole o conteúdo de `supabase/migrations/create_task_comments.sql`
4. Execute
5. Verifique se aparece "Success"

## Próximo Passo

Após confirmar que a tabela existe em **AMBOS** os bancos:

1. **Aguarde 2-5 minutos** para o cache atualizar
2. Ou **force o refresh do schema cache**:
   - Settings → API → Reload Schema
3. **Teste criar um comentário** na aplicação

