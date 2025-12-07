# 🔧 ADICIONAR WHATSAPP NO PROD - Guia Rápido

## ⚠️ SITUAÇÃO

O campo `profiles.whatsapp` **não existe** no banco PROD.

---

## ✅ SOLUÇÃO RÁPIDA

### 1️⃣ EXECUTAR EM PROD

1. **Abrir arquivo:**
   - `supabase/MIGRATION_ADICIONAR_WHATSAPP_PROD.sql`

2. **Copiar TODO o conteúdo** (Ctrl+A, Ctrl+C)

3. **No Supabase PROD:**
   - Acesse: https://app.supabase.com
   - **IMPORTANTE:** Selecione projeto **PRODUCTION**
   - SQL Editor → New Query
   - Cole o conteúdo
   - Clique **RUN**

4. **Validar:**
   - Execute `SCRIPT_VALIDAR_NOVOS_CAMPOS.sql` novamente
   - Agora `profiles.whatsapp` deve estar ✅

---

## 📋 ALTERNATIVA: USAR MIGRATION COMPLETA

Se preferir, use o script completo que adiciona **TODOS** os campos:

📄 `supabase/MIGRATION_ADICIONAR_CAMPOS_FALTANTES.sql`

Este script agora inclui o campo whatsapp também, então adiciona:
- ✅ `profiles.whatsapp`
- ✅ `workspaces.trial_ends_at`
- ✅ `workspaces.subscription_status`
- ✅ `workspaces.subscription_id`
- ✅ Status 'review' em tasks

---

## 🎯 RECOMENDAÇÃO

**Use `MIGRATION_ADICIONAR_CAMPOS_FALTANTES.sql`** pois:
- Adiciona todos os campos de uma vez
- Evita executar múltiplos scripts
- Garante que tudo fique sincronizado

---

**✅ Execute e me diga se funcionou!**

