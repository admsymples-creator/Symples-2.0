# ⚡ EXECUTAR SCHEMA V2.1 - GUIA RÁPIDO

## 🎯 RESUMO ULTRA-RÁPIDO

### 1️⃣ ESCOLHER ARQUIVO

**Se banco já tem dados:** Use `MIGRATION_ADD_NEW_FIELDS.sql`  
**Se banco está vazio:** Use `schema_v2_master.sql`

---

### 2️⃣ EXECUTAR EM DEV

1. Abrir arquivo → Copiar tudo
2. Supabase DEV → SQL Editor → New Query
3. Colar → RUN
4. Validar tabelas

---

### 3️⃣ EXECUTAR EM PROD

1. **Mesmo arquivo** usado em DEV
2. Supabase PROD → SQL Editor → New Query
3. Colar → RUN
4. Validar tabelas

---

### 4️⃣ VALIDAR

Execute `SCRIPT_COMPARAR_DEV_PROD.sql` em ambos e compare resultados.

---

**📖 Guia completo:** Consulte `EXECUTAR_SCHEMA_V2_DEV_PROD.md`

