# 🔄 EXECUTAR SCHEMA EM DEV E PROD

## 🎯 Objetivo
Garantir que DEV e PROD tenham exatamente o mesmo schema.

---

## ✅ PASSO A PASSO

### 1️⃣ PREPARAR O SCHEMA
O arquivo `supabase/schema.sql` é a **fonte única da verdade**. Use ele em ambos os ambientes.

---

### 2️⃣ EXECUTAR EM DEV (Primeiro)

1. **Abra o arquivo:**
   - `supabase/schema.sql`

2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)

3. **No Supabase DEV:**
   - Acesse: https://app.supabase.com
   - Selecione projeto **DEV/PREVIEW**
   - Menu → **SQL Editor** → **New Query**
   - Cole o schema completo
   - Clique **RUN** (Ctrl+Enter)

4. **Validar:**
   - Vá em **Table Editor**
   - Deve ver 9 tabelas criadas

---

### 3️⃣ EXECUTAR EM PROD (Depois)

1. **Use o MESMO arquivo:**
   - `supabase/schema.sql`
   - **Mesmo conteúdo**, não altere nada!

2. **No Supabase PROD:**
   - Acesse: https://app.supabase.com
   - Selecione projeto **PRODUCTION**
   - Menu → **SQL Editor** → **New Query**
   - Cole o schema completo
   - Clique **RUN** (Ctrl+Enter)

3. **Validar:**
   - Vá em **Table Editor**
   - Deve ver 9 tabelas criadas

---

### 4️⃣ COMPARAR (Validar Sincronização)

1. **No DEV:**
   - Execute `supabase/SCRIPT_COMPARAR_DEV_PROD.sql`
   - Copie os resultados

2. **No PROD:**
   - Execute `supabase/SCRIPT_COMPARAR_DEV_PROD.sql`
   - Copie os resultados

3. **Compare:**
   - Os valores devem ser **idênticos**
   - Se houver diferenças, ajuste o que estiver diferente

---

## 📋 RESULTADO ESPERADO

Após executar em ambos:

### DEV deve ter:
- ✅ 9 tabelas
- ✅ Mesmas policies
- ✅ Mesmos triggers
- ✅ Mesmas funções

### PROD deve ter:
- ✅ 9 tabelas
- ✅ Mesmas policies
- ✅ Mesmos triggers
- ✅ Mesmas funções

**Os números devem ser EXATAMENTE os mesmos!**

---

## ⚠️ IMPORTANTE

- ✅ **Use o MESMO arquivo** `schema.sql` em ambos
- ✅ **Execute em DEV primeiro** para testar
- ✅ **Sempre valide** após executar
- ❌ **Nunca faça mudanças diretas** no banco sem atualizar o schema.sql

---

## 🔧 SE PRECISAR FAZER MUDANÇAS

1. Edite `supabase/schema.sql` localmente
2. Execute em DEV primeiro (teste)
3. Se funcionar, execute no PROD
4. Ambos ficam sincronizados novamente

---

**✅ Após seguir estes passos, DEV e PROD estarão sincronizados!**

