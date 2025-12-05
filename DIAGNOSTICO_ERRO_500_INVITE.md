# 🔍 Diagnóstico do Erro 500 ao Convidar Membros

## Problema

Ao tentar enviar um convite via `/settings?tab=members`, ocorre um erro **500 Internal Server Error**.

## ✅ Correções Aplicadas

1. ✅ Adicionado `try-catch` geral na função `inviteMember` para capturar todos os erros
2. ✅ Melhorado logging de erros com informações detalhadas
3. ✅ Verificações de RLS e permissões já estão implementadas

## 🔍 Como Diagnosticar o Erro 500

### Passo 1: Verificar Logs do Terminal do Servidor

No terminal onde está rodando `npm run dev`, procure por:

```
❌ Erro crítico em inviteMember: { ... }
```

Ou outras mensagens de erro que comecem com:
- `Erro ao verificar permissões`
- `Erro ao buscar dados do workspace`
- `Erro ao criar convite`
- `Erro ao adicionar membro existente`

### Passo 2: Verificar Console do Navegador

No console do navegador (F12 → Console), você pode ver:
- A mensagem de erro retornada
- O status 500
- Detalhes do erro da requisição

### Passo 3: Possíveis Causas

#### 1. **Problema de Permissão RLS**

**Sintoma:** Erro ao criar convite ou adicionar membro

**Solução:** Verifique se você tem permissão de `admin` ou `owner` no workspace.

**Verificação:**
```sql
SELECT role FROM workspace_members 
WHERE workspace_id = 'SEU_WORKSPACE_ID' 
AND user_id = 'SEU_USER_ID';
```

#### 2. **Workspace Não Encontrado**

**Sintoma:** "Workspace não encontrado" ou erro ao buscar workspace

**Solução:** Verifique se o `workspaceId` está correto.

#### 3. **Email Inválido ou Duplicado**

**Sintoma:** 
- "Este usuário já é membro do workspace"
- "Já existe um convite pendente para este email"

**Solução:** Use um email diferente ou remova o convite pendente.

#### 4. **Erro ao Enviar Email**

**Sintoma:** O convite é criado, mas há erro ao enviar email

**Solução:** Verifique a configuração do Resend:
- `RESEND_API_KEY` está configurada no `.env.local`
- O domínio está verificado no Resend

**Nota:** O erro de email **não deve causar 500** porque está em um `try-catch` separado.

#### 5. **Erro de RLS ao Inserir em `workspace_invites`**

**Sintoma:** Erro ao criar convite no banco de dados

**Solução:** Verifique se a política RLS permite que admins criem convites:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'workspace_invites'
AND policyname LIKE '%create%' OR policyname LIKE '%insert%';
```

## 🔧 Ações para Resolver

### 1. Verificar Logs Detalhados

Procure no terminal do servidor por erros específicos. O novo `try-catch` deve mostrar informações detalhadas sobre o erro.

### 2. Testar Passo a Passo

1. **Teste com usuário que já existe:**
   - Deve adicionar diretamente ao workspace
   - Não deve criar convite

2. **Teste com usuário novo:**
   - Deve criar convite pendente
   - Deve tentar enviar email

3. **Teste com workspace inválido:**
   - Deve retornar erro específico

### 3. Verificar Configuração do Resend

Mesmo que o erro não seja do email, verifique:

```bash
# No .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@seu-dominio.com
```

## 📝 Informações Necessárias

Para resolver o problema, preciso que você me envie:

1. **Logs completos do terminal do servidor** quando ocorre o erro 500
   - Procure por `❌ Erro crítico em inviteMember`
   - Copie toda a mensagem de erro

2. **Mensagem de erro do console do navegador**
   - Abra o DevTools (F12)
   - Vá em "Console" ou "Network"
   - Copie a mensagem de erro

3. **Informações sobre o convite:**
   - Email que você está tentando convidar
   - Se o usuário já existe no sistema ou não
   - Se já existe um convite pendente

4. **Informações do workspace:**
   - Seu papel no workspace (owner/admin)
   - ID do workspace (se possível)

## 🚀 Próximos Passos

1. Tente enviar um convite novamente
2. Copie **TODOS os logs** do terminal do servidor
3. Copie a mensagem de erro do navegador
4. Envie essas informações para que eu possa identificar o problema exato

## ⚠️ Nota Importante

O erro 500 significa que algo inesperado está acontecendo. Com o novo `try-catch` geral, todos os erros devem ser logados com detalhes completos, facilitando a identificação do problema.

