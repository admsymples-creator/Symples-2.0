# 🔗 CONFIGURAR URLs NO VERCEL - Passo a Passo

## 📋 O QUE PRECISA SER CONFIGURADO

Você precisa configurar as variáveis de ambiente no Vercel para cada ambiente:
- **Production** → URLs do Supabase PROD
- **Preview** → URLs do Supabase PREVIEW

---

## 🎯 PASSO A PASSO NO VERCEL

### 1️⃣ ACESSAR AS VARIÁVEIS DE AMBIENTE

1. Acesse: **https://vercel.com**
2. Entre na sua conta
3. Selecione seu projeto **Symples**
4. No menu superior, clique em **Settings**
5. No menu lateral esquerdo, clique em **Environment Variables**

---

### 2️⃣ OBTER AS CREDENCIAIS DO SUPABASE

#### Para PRODUÇÃO:
1. Acesse: **https://app.supabase.com**
2. Selecione seu projeto de **PRODUÇÃO**
3. Vá em **Settings** → **API**
4. Anote:
   - **Project URL** → Esta será a `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Esta será a `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Para PREVIEW:
1. No Supabase, selecione seu projeto de **PREVIEW**
2. Repita os passos acima

---

### 3️⃣ CONFIGURAR NO VERCEL

#### Para PRODUCTION:

1. Na seção **Environment Variables**, clique em **Add New**
2. Adicione a primeira variável:
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Cole a URL do projeto PROD (ex: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Environments:** Marque apenas **Production** ✅
   - Clique em **Save**

3. Adicione a segunda variável:
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Cole a chave anon do projeto PROD
   - **Environments:** Marque apenas **Production** ✅
   - Clique em **Save**

#### Para PREVIEW:

1. Adicione a primeira variável:
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Cole a URL do projeto PREVIEW
   - **Environments:** Marque apenas **Preview** ✅
   - Clique em **Save**

2. Adicione a segunda variável:
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Cole a chave anon do projeto PREVIEW
   - **Environments:** Marque apenas **Preview** ✅
   - Clique em **Save**

---

### 4️⃣ RESULTADO ESPERADO

Você deve ter **4 variáveis** no total:

| Name | Environment | Value |
|------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | `https://...prod.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | `eyJhbGc...` (chave PROD) |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview | `https://...preview.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview | `eyJhbGc...` (chave PREVIEW) |

---

### 5️⃣ REDEPLOY

Após configurar as variáveis:

1. Vá em **Deployments**
2. Encontre o último deployment
3. Clique nos **3 pontinhos** (⋮)
4. Selecione **Redeploy**
5. Certifique-se de que está marcado **Use existing Build Cache**
6. Clique em **Redeploy**
7. Aguarde o deploy completar

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### Após o redeploy:

1. Acesse sua aplicação em **produção**
2. Abra o console do navegador (F12)
3. Verifique se não há erros relacionados ao Supabase
4. Faça login e teste criar uma tarefa

Se funcionar, as URLs estão configuradas corretamente! ✅

---

## ⚠️ TROUBLESHOOTING

### Problema: "Supabase URL not configured"
**Causa:** Variável não configurada ou nome errado.

**Solução:**
- Verifique se o nome está exatamente: `NEXT_PUBLIC_SUPABASE_URL`
- Verifique se está marcado o ambiente correto (Production/Preview)
- Faça redeploy após configurar

### Problema: Aplicação ainda conecta no PREVIEW em produção
**Causa:** Variáveis antigas em cache ou ambiente errado.

**Solução:**
- Verifique se as variáveis estão marcadas para **Production** (não All)
- Limpe o cache do Vercel antes do redeploy
- Verifique se não há variáveis duplicadas conflitantes

### Problema: Erro de autenticação
**Causa:** Chave anon incorreta ou URL errada.

**Solução:**
- Verifique se copiou a chave completa (é muito longa)
- Verifique se não há espaços extras
- Confirme que está usando as credenciais do projeto correto

---

## 📝 CHECKLIST

- [ ] Credenciais PROD obtidas do Supabase
- [ ] Credenciais PREVIEW obtidas do Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada para Production
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada para Production
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada para Preview
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada para Preview
- [ ] Redeploy feito após configurar
- [ ] Teste em produção funcionando

---

## 🎯 ESTRUTURA FINAL NO VERCEL

```
Environment Variables:
├── Production
│   ├── NEXT_PUBLIC_SUPABASE_URL (PROD URL)
│   └── NEXT_PUBLIC_SUPABASE_ANON_KEY (PROD KEY)
└── Preview
    ├── NEXT_PUBLIC_SUPABASE_URL (PREVIEW URL)
    └── NEXT_PUBLIC_SUPABASE_ANON_KEY (PREVIEW KEY)
```

---

**✅ Após configurar tudo, sua aplicação estará conectada aos bancos corretos!**
