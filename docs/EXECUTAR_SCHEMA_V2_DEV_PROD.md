# 🚀 EXECUTAR SCHEMA V2.1 - DEV E PROD (Passo a Passo Completo)

## 📋 RESUMO

Este guia te ajudará a executar o novo schema (v2.1) em ambos os bancos de dados:
1. **DEV** primeiro (para testar)
2. **PROD** depois (após validar)

---

## 🎯 ARQUIVOS NECESSÁRIOS

Você precisa de 2 arquivos:
1. `supabase/schema_v2_master.sql` - Schema completo (use em bancos novos ou para recriar tudo)
2. `supabase/MIGRATION_ADD_NEW_FIELDS.sql` - Migration para adicionar novos campos (use em bancos existentes)

---

## ⚠️ DECISÃO IMPORTANTE

### Cenário A: Banco já existe (recomendado)
Se você já tem dados no banco, use **apenas a migration**:
- Execute `MIGRATION_ADD_NEW_FIELDS.sql` em DEV
- Execute `MIGRATION_ADD_NEW_FIELDS.sql` em PROD

### Cenário B: Banco novo ou quer recriar tudo
Se o banco está vazio ou quer recriar tudo do zero:
- Execute `schema_v2_master.sql` completo

---

## 🔧 PARTE 1: EXECUTAR EM DEV (PRIMEIRO)

### Passo 1.1: Escolher o Arquivo

**Se o banco DEV já tem dados:**
- Use: `supabase/MIGRATION_ADD_NEW_FIELDS.sql` ✅

**Se o banco DEV está vazio:**
- Use: `supabase/schema_v2_master.sql` ✅

---

### Passo 1.2: Abrir o Arquivo

1. No seu editor, abra o arquivo escolhido
2. Selecione TODO o conteúdo (`Ctrl+A`)
3. Copie tudo (`Ctrl+C`)

---

### Passo 1.3: Executar no Supabase DEV

1. Acesse: **https://app.supabase.com**
2. **IMPORTANTE:** Selecione o projeto **DEV/PREVIEW** (não PROD!)
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo completo (`Ctrl+V`)
6. Clique em **RUN** ou pressione `Ctrl+Enter`
7. Aguarde a execução (30-60 segundos)

---

### Passo 1.4: Validar em DEV

1. Vá em **Table Editor**
2. Verifique se as tabelas estão criadas:
   - ✅ `profiles` (deve ter campo `whatsapp`)
   - ✅ `workspaces` (deve ter campos `trial_ends_at`, `subscription_status`, `subscription_id`)
   - ✅ `tasks` (status deve aceitar 'review')

3. **Testar se funciona:**
   - Crie uma tarefa com status 'review'
   - Verifique se um workspace novo tem trial_ends_at

---

## 🔧 PARTE 2: EXECUTAR EM PROD (DEPOIS)

**⚠️ SÓ EXECUTE EM PROD DEPOIS DE VALIDAR EM DEV!**

### Passo 2.1: Escolher o Arquivo

**Se o banco PROD já tem dados:**
- Use: `supabase/MIGRATION_ADD_NEW_FIELDS.sql` ✅

**Se o banco PROD está vazio:**
- Use: `supabase/schema_v2_master.sql` ✅

---

### Passo 2.2: Abrir o Arquivo

1. Use o **MESMO arquivo** que usou em DEV
2. Selecione TODO o conteúdo (`Ctrl+A`)
3. Copie tudo (`Ctrl+C`)

---

### Passo 2.3: Executar no Supabase PROD

1. Acesse: **https://app.supabase.com**
2. **IMPORTANTE:** Selecione o projeto **PRODUCTION**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo completo (`Ctrl+V`)
6. Clique em **RUN** ou pressione `Ctrl+Enter`
7. Aguarde a execução (30-60 segundos)

---

### Passo 2.4: Validar em PROD

1. Vá em **Table Editor**
2. Verifique se as tabelas estão atualizadas
3. Execute o script de comparação (próxima seção)

---

## 🔍 PARTE 3: VALIDAR SINCRONIZAÇÃO

### Passo 3.1: Executar Script de Comparação

1. **No DEV:**
   - SQL Editor → New Query
   - Execute `supabase/SCRIPT_COMPARAR_DEV_PROD.sql`
   - Copie os resultados

2. **No PROD:**
   - SQL Editor → New Query
   - Execute `supabase/SCRIPT_COMPARAR_DEV_PROD.sql`
   - Copie os resultados

3. **Compare:**
   - Os valores devem ser **idênticos**
   - Se diferentes, ajuste o que estiver diferente

---

## 📋 CHECKLIST FINAL

### DEV:
- [ ] Schema/Migration executado
- [ ] Tabelas verificadas
- [ ] Campo `whatsapp` existe em profiles
- [ ] Campos `trial_ends_at`, `subscription_status` existem em workspaces
- [ ] Status 'review' funciona em tasks
- [ ] Testes funcionando

### PROD:
- [ ] Schema/Migration executado (mesmo arquivo usado em DEV)
- [ ] Tabelas verificadas
- [ ] Script de comparação executado
- [ ] Valores idênticos ao DEV

---

## 🐛 TROUBLESHOOTING

### Erro: "column already exists"
**Causa:** Campo já existe (executou migration antes).

**Solução:**
- Isso é normal! A migration usa `IF NOT EXISTS`
- Pode ignorar ou usar `schema_v2_master.sql` que usa `DROP IF EXISTS`

### Erro: "constraint already exists"
**Causa:** Constraint já foi criada.

**Solução:**
- Normal também
- O schema usa `DROP CONSTRAINT IF EXISTS` antes de criar

### Erro: "permission denied"
**Causa:** Não tem permissão ou projeto errado.

**Solução:**
- Verifique se está no projeto correto (DEV ou PROD)
- Verifique se você é owner/admin

### Migration executa mas não adiciona campos
**Causa:** Campos já existem ou erro silencioso.

**Solução:**
1. Verifique se os campos existem:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'whatsapp';
   ```
2. Se não existirem, execute novamente
3. Verifique logs de erro no Supabase

---

## 🎯 PRÓXIMOS PASSOS APÓS EXECUTAR

1. **Atualizar TypeScript Types:**
   - Regenerar `types/database.types.ts` do Supabase
   - Ou atualizar manualmente com os novos campos

2. **Atualizar Código:**
   - Verificar onde `status` é usado
   - Adicionar lógica de trial/subscription
   - Atualizar componentes se necessário

3. **Testar:**
   - Criar workspace e verificar trial
   - Criar tarefa com status 'review'
   - Testar integração WhatsApp com campo whatsapp

---

## ✅ RESULTADO ESPERADO

Após executar em ambos:

### Novos Campos:
- ✅ `profiles.whatsapp`
- ✅ `workspaces.trial_ends_at`
- ✅ `workspaces.subscription_status`
- ✅ `workspaces.subscription_id`

### Novas Funcionalidades:
- ✅ Status 'review' em tasks
- ✅ Trial automático de 15 dias
- ✅ Funções auxiliares para trial/subscription
- ✅ Índices otimizados

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs no Supabase Dashboard → Logs
2. Compare com o resultado em DEV
3. Execute o script de comparação para identificar diferenças

---

**✅ Após seguir estes passos, DEV e PROD estarão sincronizados com o schema v2.1!**

