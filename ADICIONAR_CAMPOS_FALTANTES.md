# 🔧 ADICIONAR CAMPOS FALTANTES - Guia Rápido

## ⚠️ SITUAÇÃO ATUAL

O script de validação mostrou:
- ✅ `profiles.whatsapp` - JÁ EXISTE
- ❌ `workspaces.trial_ends_at` - **FALTA**
- ❌ `workspaces.subscription_status` - **FALTA**
- ❌ `workspaces.subscription_id` - **FALTA**
- ❌ `tasks.status` com 'review' - **FALTA**

---

## ✅ SOLUÇÃO

Execute o script de migration para adicionar os campos faltantes:

### 1️⃣ EXECUTAR EM DEV

1. **Abrir arquivo:**
   - `supabase/MIGRATION_ADICIONAR_CAMPOS_FALTANTES.sql`

2. **Copiar TODO o conteúdo** (Ctrl+A, Ctrl+C)

3. **No Supabase DEV:**
   - Acesse: https://app.supabase.com
   - Selecione projeto **DEV**
   - SQL Editor → New Query
   - Cole o conteúdo
   - Clique **RUN**

4. **Validar:**
   - Execute `SCRIPT_VALIDAR_NOVOS_CAMPOS.sql` novamente
   - Agora todos devem estar ✅

---

### 2️⃣ EXECUTAR EM PROD

1. **Use o MESMO arquivo:**
   - `supabase/MIGRATION_ADICIONAR_CAMPOS_FALTANTES.sql`

2. **No Supabase PROD:**
   - Acesse: https://app.supabase.com
   - Selecione projeto **PRODUCTION**
   - SQL Editor → New Query
   - Cole o conteúdo
   - Clique **RUN**

3. **Validar:**
   - Execute `SCRIPT_VALIDAR_NOVOS_CAMPOS.sql` novamente
   - Todos devem estar ✅

---

## 📋 O QUE O SCRIPT FAZ

1. ✅ Adiciona `trial_ends_at` em workspaces
2. ✅ Adiciona `subscription_status` em workspaces
3. ✅ Adiciona `subscription_id` em workspaces
4. ✅ Adiciona status 'review' em tasks
5. ✅ Cria índices para performance
6. ✅ Cria funções auxiliares (is_trial_active, has_active_subscription)
7. ✅ Inicializa trials para workspaces existentes

---

## ✅ APÓS EXECUTAR

Execute novamente o `SCRIPT_VALIDAR_NOVOS_CAMPOS.sql` e todos os campos devem estar ✅!

---

**🚀 Execute agora e me diga se funcionou!**

