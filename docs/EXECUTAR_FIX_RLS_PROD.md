# 🔧 CORRIGIR RLS POLICIES - PRODUÇÃO

## ⚠️ PROBLEMA

Ao tentar criar workspace em produção, ocorre o erro:
```
Erro de permissão: RLS policies não configuradas no Supabase.
```

Isso já foi reproduzido com conta **agency** na versão live.

## ✅ SOLUÇÃO

Execute o script de correção das RLS policies.

---

## 📋 PASSOS

### 1. Executar em PRODUÇÃO (PRIMEIRO)

1. **Abrir arquivo:**
   - `supabase/MIGRATION_FIX_WORKSPACE_RLS.sql`

2. **Copiar TODO o conteúdo** (Ctrl+A, Ctrl+C)

3. **No Supabase PROD:**
   - Acesse: https://app.supabase.com
   - **IMPORTANTE:** Selecione o projeto **PRODUCTION**
   - SQL Editor → New Query
   - Cole o conteúdo completo
   - Clique **RUN**

4. **Validar:**
   - Deve retornar: "✅ RLS Policies corrigidas!"
   - Tente criar um workspace novamente
   - Se falhar, confirme que o projeto PROD correto foi selecionado

---

### 2. Executar em DEV (Depois)

1. **Use o MESMO arquivo:**
   - `supabase/MIGRATION_FIX_WORKSPACE_RLS.sql`

2. **No Supabase DEV:**
   - Acesse: https://app.supabase.com
   - Selecione projeto **DEV/PREVIEW**
   - SQL Editor → New Query
   - Cole e execute

---

## 🔍 O QUE O SCRIPT FAZ

1. **Corrige Policy de SELECT em workspaces:**
   - Permite que owners vejam seus workspaces recém-criados
   - Mantém verificação de subscription para membros

2. **Corrige Policy de INSERT em workspace_members:**
   - Permite que owners se adicionem como membros durante criação
   - Mantém permissão para admins adicionarem outros membros

---

## ✅ APÓS EXECUTAR

O erro "RLS policies não configuradas" deve ser resolvido e você conseguirá criar workspaces normalmente.

---

**🚀 Execute agora em PROD e teste a criação de workspace!**








