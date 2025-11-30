# 🔄 Fix: Schema Cache do Supabase

## Problema

Após criar a tabela `task_comments`, você pode receber o erro:
```
"Could not find the table 'public.task_comments' in the schema cache"
```

Isso acontece porque o Supabase PostgREST (API REST) mantém um cache do schema que precisa ser atualizado.

## ✅ Soluções (Tente nesta ordem)

### 1. Aguardar alguns minutos (Mais Simples)

O cache do Supabase atualiza automaticamente a cada 1-5 minutos. 

**Ação:**
- Aguarde 2-5 minutos
- Tente criar um comentário novamente
- Geralmente funciona automaticamente

---

### 2. Forçar Refresh do Schema Cache

**No Supabase Dashboard:**

1. Acesse o **Supabase Dashboard**
2. Vá em **Settings** → **API**
3. Role até a seção **PostgREST**
4. Clique em **Reload Schema** ou **Refresh Schema Cache**
5. Aguarde alguns segundos
6. Tente novamente na aplicação

---

### 3. Verificar se a tabela existe e está acessível

Execute este SQL no SQL Editor:

```sql
-- Verificar se a tabela existe
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'task_comments';

-- Verificar permissões
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'task_comments';
```

**Resultado esperado:**
- A tabela deve aparecer
- Deve ter permissões para `authenticated` e `anon` roles

---

### 4. Reiniciar o projeto Supabase (Último recurso)

Se nada funcionar:

1. No **Supabase Dashboard**
2. Vá em **Settings** → **General**
3. Role até **Restart Project**
4. Clique em **Restart**
5. Aguarde 1-2 minutos
6. Tente novamente

⚠️ **Atenção:** Isso pode causar uma breve indisponibilidade.

---

### 5. Verificar se está no projeto correto

Certifique-se de que:
- ✅ A tabela foi criada no mesmo projeto que a aplicação está usando
- ✅ As variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` apontam para o projeto correto
- ✅ Você está testando no mesmo ambiente (DEV ou PROD) onde criou a tabela

---

## 🧪 Teste Rápido

Após tentar as soluções acima, teste diretamente no SQL Editor:

```sql
-- Teste inserir um comentário manualmente
INSERT INTO public.task_comments (task_id, user_id, content, type)
VALUES (
    'um-task-id-valido-aqui',
    auth.uid(),
    'Teste de comentário',
    'comment'
)
RETURNING *;
```

Se isso funcionar, o problema é apenas o cache. Se não funcionar, há um problema com a tabela ou permissões.

---

## 📝 Checklist

- [ ] Aguardou 2-5 minutos após criar a tabela
- [ ] Tentou forçar refresh do schema cache
- [ ] Verificou que a tabela existe no SQL Editor
- [ ] Verificou que está no projeto correto
- [ ] Testou inserir um comentário manualmente no SQL Editor
- [ ] Reiniciou o projeto (se necessário)

---

## 💡 Dica

Para evitar esse problema no futuro:
- Sempre aguarde alguns minutos após criar novas tabelas
- Ou force o refresh do schema cache imediatamente após criar tabelas
- Considere usar migrations do Supabase CLI para gerenciar mudanças de schema

