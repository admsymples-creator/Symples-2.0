# Correção de Workspaces Antigos

## Problema
Workspaces criados há mais de 30 dias ainda estão com `subscription_status = 'trialing'` e mostram o banner de trial, quando deveriam estar como `'active'`.

## Solução Rápida (Execute Agora)

1. Acesse o [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Cole e execute este SQL:

```sql
UPDATE public.workspaces
SET 
    subscription_status = 'active',
    trial_ends_at = NULL
WHERE created_at < NOW() - INTERVAL '30 days'
  AND subscription_status = 'trialing';
```

3. Verifique o resultado:

```sql
SELECT 
    id,
    name,
    created_at,
    subscription_status,
    trial_ends_at,
    NOW() - created_at AS idade_workspace
FROM public.workspaces
WHERE created_at < NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

## Migration Automática

A migration `20251231092216_fix_all_old_workspaces.sql` foi criada e será executada automaticamente na próxima vez que você rodar as migrations.

Para executar manualmente:

```bash
# Se estiver usando Supabase CLI
supabase db reset
# ou
supabase migration up
```

## Verificação

Após executar, o banner de trial não deve mais aparecer para workspaces antigos (>30 dias).

