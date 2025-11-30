# 🚀 CONFIGURAÇÃO DO BANCO DE DADOS PRODUÇÃO

Este guia te ajudará a configurar o banco de dados Supabase de **PRODUÇÃO** após ter configurado o PREVIEW.

---

## 📋 PRÉ-REQUISITOS

- ✅ Acesso ao Dashboard do Supabase (produção)
- ✅ Arquivo `supabase/schema.sql` disponível
- ✅ Credenciais do projeto de produção (URL e ANON KEY)

---

## 🔧 PASSO 1: EXECUTAR O SCHEMA NO SUPABASE PROD

### Opção A: Via SQL Editor (Recomendado)

1. **Acesse o Dashboard do Supabase PROD:**
   - Vá para [https://app.supabase.com](https://app.supabase.com)
   - Selecione seu projeto de **PRODUÇÃO**

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New Query**

3. **Execute o Schema:**
   - Abra o arquivo `supabase/schema.sql` do projeto
   - Copie **TODO** o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em **Run** (ou pressione `Ctrl+Enter` / `Cmd+Enter`)

4. **Verificar Execução:**
   - Verifique se apareceu a mensagem: `Success. No rows returned`
   - Ou se todas as tabelas foram criadas sem erros

5. **Validar Tabelas:**
   - Vá em **Table Editor** no menu lateral
   - Verifique se as seguintes tabelas foram criadas:
     - ✅ `profiles`
     - ✅ `workspaces`
     - ✅ `workspace_members`
     - ✅ `tasks`
     - ✅ `task_attachments`
     - ✅ `task_comments`
     - ✅ `transactions`
     - ✅ `workspace_invites`
     - ✅ `audit_logs`

---

### Opção B: Via Supabase CLI (Avançado)

Se você tem o Supabase CLI configurado:

```bash
# 1. Linkar com o projeto de produção
supabase link --project-ref seu-project-ref-prod

# 2. Executar o schema
supabase db push
```

---

## 🔑 PASSO 2: CONFIGURAR VARIÁVEIS DE AMBIENTE DE PROD

### No Vercel (ou plataforma de deploy)

1. **Acesse as Environment Variables:**
   - Vá para o projeto no Vercel
   - Settings → Environment Variables

2. **Adicione/Atualize as variáveis:**

   Para o ambiente **Production**, adicione:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-prod.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-prod
   ```

   Para o ambiente **Preview**, mantenha as variáveis de preview:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-preview.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-preview
   ```

3. **Onde encontrar as credenciais:**
   - Acesse o Dashboard do Supabase PROD
   - Vá em **Settings** → **API**
   - Copie:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Redeploy:**
   - Após adicionar as variáveis, faça um novo deploy
   - Ou vá em **Deployments** → **Redeploy** na última versão

---

## ✅ PASSO 3: VALIDAÇÃO

### 3.1. Testar RLS Policies

1. **No Supabase PROD:**
   - Vá em **Table Editor** → selecione a tabela `tasks`
   - Verifique se aparece o ícone de **escudo** (🔒) indicando que RLS está habilitado

2. **Testar Autenticação:**
   - Acesse sua aplicação em produção
   - Faça login
   - Tente criar uma tarefa
   - Verifique se funciona corretamente

### 3.2. Verificar Triggers

Teste se o trigger de criação de profile funciona:

1. Crie um novo usuário na aplicação de produção
2. Verifique no Supabase se o registro foi criado automaticamente em `profiles`
3. Verifique se o trigger `handle_new_user` está ativo

### 3.3. Verificar Índices

Os índices devem ter sido criados automaticamente com o schema. Verifique no SQL Editor:

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

---

## 🔍 PASSO 4: VERIFICAÇÃO FINAL

Execute este script no SQL Editor do Supabase PROD para verificar se tudo está configurado:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- Verificar funções
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Resultados esperados:**
- ✅ 9 tabelas (profiles, workspaces, workspace_members, tasks, task_attachments, task_comments, transactions, workspace_invites, audit_logs)
- ✅ Todas as tabelas com `rowsecurity = true`
- ✅ Pelo menos 3 triggers (on_auth_user_created, on_workspace_created, updated_at triggers)
- ✅ Funções auxiliares (is_workspace_member, is_workspace_admin, handle_new_user, etc.)

---

## 🐛 TROUBLESHOOTING

### Erro: "relation already exists"

**Causa:** Tabelas já existem no banco.

**Solução:**
- O schema usa `CREATE TABLE IF NOT EXISTS`, então não deveria dar erro
- Se der erro, pode ser que algo foi criado manualmente antes
- Execute: `DROP TABLE IF EXISTS nome_da_tabela CASCADE;` e rode o schema novamente

### Erro: "permission denied"

**Causa:** Falta de permissões no banco.

**Solução:**
- Certifique-se de estar logado como owner/admin do projeto Supabase
- Verifique se está usando o projeto correto (PROD vs PREVIEW)

### RLS não está funcionando

**Causa:** Policies não foram criadas ou estão incorretas.

**Solução:**
1. Verifique se as policies foram criadas:
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```
2. Se não existirem, execute novamente a seção de RLS Policies do `schema.sql`

### Variáveis de ambiente não estão sendo usadas

**Causa:** Cache ou variáveis não configuradas corretamente.

**Solução:**
1. Verifique se as variáveis estão no ambiente correto (Production vs Preview)
2. Faça um redeploy completo
3. Limpe o cache do Vercel se necessário

---

## 📝 CHECKLIST FINAL

- [ ] Schema executado no Supabase PROD
- [ ] Todas as tabelas criadas e visíveis no Table Editor
- [ ] RLS habilitado em todas as tabelas (ícone de escudo visível)
- [ ] Triggers criados e funcionando
- [ ] Variáveis de ambiente configuradas no Vercel (Production)
- [ ] Aplicação em produção usando as variáveis corretas
- [ ] Teste de autenticação funcionando
- [ ] Teste de criação de tarefa funcionando
- [ ] Verificação SQL executada com sucesso

---

## 🎯 PRÓXIMOS PASSOS

Após configurar o banco de produção:

1. **Teste completo:** Faça testes end-to-end na aplicação de produção
2. **Monitoramento:** Configure alertas no Supabase para monitorar erros
3. **Backup:** Configure backups automáticos no Supabase (Settings → Database)
4. **Documentação:** Atualize a documentação do projeto com as credenciais (se necessário)

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs no Supabase Dashboard → Logs
2. Verifique os logs de deploy no Vercel
3. Consulte a documentação do Supabase: [https://supabase.com/docs](https://supabase.com/docs)

---

**Última atualização:** Agora  
**Status:** Pronto para configuração de produção

