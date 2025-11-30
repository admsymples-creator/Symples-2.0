# ⚡ ADICIONAR CAMPOS NO PROD - AGORA

## ❌ PROBLEMA
No PROD faltam os campos:
- `profiles.whatsapp`
- `workspaces.trial_ends_at`
- `workspaces.subscription_status`
- `workspaces.subscription_id`
- Status 'review' em tasks

---

## ✅ SOLUÇÃO

### 1. Abrir arquivo:
📄 `supabase/MIGRATION_ADICIONAR_CAMPOS_FALTANTES.sql`

### 2. Copiar TUDO (Ctrl+A, Ctrl+C)

### 3. No Supabase PROD:
- https://app.supabase.com
- Selecionar projeto **PRODUCTION**
- SQL Editor → New Query
- Colar → RUN

### 4. Validar:
- Execute `SCRIPT_VALIDAR_NOVOS_CAMPOS.sql` novamente
- Todos devem estar ✅

---

**🚀 Execute agora!**

