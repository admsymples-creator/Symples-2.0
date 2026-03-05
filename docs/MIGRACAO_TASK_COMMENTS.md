# 🔄 Migração: Criar Tabela task_comments

Esta migração cria a tabela `task_comments` e suas políticas RLS.

## 📋 Onde Executar

Execute esta migração em **AMBOS** os bancos de dados:
- ✅ **DEV** (Preview/Desenvolvimento)
- ✅ **PROD** (Produção)

## 🚀 Passo a Passo

### 1. Executar no Banco DEV

1. **Acesse o Dashboard do Supabase DEV:**
   - Vá para [https://app.supabase.com](https://app.supabase.com)
   - Selecione seu projeto de **DESENVOLVIMENTO/PREVIEW**

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New Query**

3. **Execute a Migração:**
   - Abra o arquivo `supabase/migrations/create_task_comments.sql`
   - Copie **TODO** o conteúdo
   - Cole no SQL Editor
   - Clique em **Run** (ou `Ctrl+Enter` / `Cmd+Enter`)

4. **Verificar:**
   - Deve aparecer: `Success. No rows returned`
   - Vá em **Table Editor** e verifique se a tabela `task_comments` foi criada

### 2. Executar no Banco PROD

1. **Acesse o Dashboard do Supabase PROD:**
   - Vá para [https://app.supabase.com](https://app.supabase.com)
   - Selecione seu projeto de **PRODUÇÃO**

2. **Repita os passos acima:**
   - SQL Editor → New Query
   - Cole o mesmo conteúdo de `supabase/migrations/create_task_comments.sql`
   - Execute

3. **Verificar:**
   - Confirme que a tabela foi criada
   - Teste criar um comentário na aplicação de produção

## ✅ Verificação

Execute este SQL em ambos os bancos para verificar:

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'task_comments';

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'task_comments';

-- Verificar políticas RLS criadas
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'task_comments';
```

**Resultados esperados:**
- ✅ Tabela `task_comments` existe
- ✅ `rowsecurity = true`
- ✅ 4 políticas criadas:
  - `Users can view comments if can view task` (SELECT)
  - `Members can comment on tasks` (INSERT)
  - `Users can update own comments` (UPDATE)
  - `Users can delete own comments` (DELETE)

## 🧪 Teste

Após executar em ambos os bancos:

1. **No DEV:**
   - Abra uma tarefa
   - Tente criar um comentário
   - Verifique se funciona

2. **No PROD:**
   - Faça o mesmo teste
   - Confirme que os comentários são salvos

## ⚠️ Importante

- Execute **sempre** primeiro no DEV
- Teste completamente no DEV antes de executar no PROD
- Se der erro, verifique se a tabela já existe (pode usar `CREATE TABLE IF NOT EXISTS`)
- Mantenha os dois bancos sincronizados

## 🐛 Troubleshooting

### Erro: "relation already exists"
- A tabela já existe, mas pode estar sem as políticas RLS
- Execute apenas a parte de políticas RLS do script

### Erro: "permission denied"
- Verifique se está logado como owner/admin do projeto
- Confirme que está no projeto correto (DEV vs PROD)

### Comentários não aparecem
- Verifique se as políticas RLS foram criadas
- Confirme que o usuário está autenticado
- Verifique os logs no Supabase Dashboard → Logs

