# 🧪 Guia Completo: Como Testar o Fluxo de Convites

Este guia fornece uma estratégia sistemática para testar o fluxo de convites no Symples.

---

## 📋 Pré-requisitos

1. **Dois emails diferentes** (ou use serviço de emails temporários):
   - Email do convidador (admin/owner do workspace)
   - Email do convidado (pessoa que receberá o convite)

2. **Servidor rodando**:
   ```bash
   npm run dev
   ```

3. **Variáveis de ambiente configuradas**:
   - `RESEND_API_KEY` (para envio de emails)
   - `NEXT_PUBLIC_SITE_URL` ou `VERCEL_URL`

---

## 🎯 Cenários de Teste Recomendados

### **Cenário 1: Usuário Novo (Não cadastrado no sistema)**

**Objetivo:** Testar o fluxo completo para um usuário que nunca acessou o sistema.

**Passos:**
1. **Como admin/owner:**
   - Faça login no workspace
   - Vá em **Configurações → Time**
   - Clique em **Convidar Membro**
   - Digite um email novo (que não está no sistema)
   - Selecione a role: `admin`, `member` ou `viewer`
   - Clique em **Enviar Convite**

2. **Como convidado:**
   - Verifique o email recebido
   - Clique no link do convite
   - Você será redirecionado para a página de convite
   - Clique em **Criar Conta** ou **Fazer Login**
   - Crie uma nova conta (se for novo) ou faça login
   - Após login/cadastro, você será redirecionado automaticamente para aceitar o convite
   - Você deve ser redirecionado para o workspace convidado: `/{workspaceSlug}/tasks?invite_accepted=true`

3. **Verificações:**
   - ✅ Email foi recebido
   - ✅ Link do convite funciona
   - ✅ Conta foi criada com sucesso
   - ✅ Redirecionamento para o workspace correto
   - ✅ Workspace aparece no seletor de workspaces
   - ✅ Você tem acesso às tarefas do workspace
   - ✅ Sua role está correta (verificar em Configurações → Time)

---

### **Cenário 2: Usuário Existente (Já cadastrado)**

**Objetivo:** Testar o fluxo para um usuário que já tem conta no sistema.

**Passos:**
1. **Como admin/owner:**
   - Faça login
   - Vá em **Configurações → Time**
   - Convide um email de um usuário que já existe no sistema
   - Selecione a role desejada

2. **Como convidado:**
   - Verifique o email
   - Clique no link do convite
   - Faça login (se não estiver logado)
   - O convite será aceito automaticamente após login
   - Você deve ser redirecionado para o workspace: `/{workspaceSlug}/tasks?invite_accepted=true`

3. **Verificações:**
   - ✅ Email foi recebido
   - ✅ Após login, convite é aceito automaticamente
   - ✅ Redirecionamento correto para o workspace
   - ✅ Workspace aparece no seletor
   - ✅ Role está correta

---

### **Cenário 3: Usuário Já É Membro**

**Objetivo:** Testar comportamento quando você convida alguém que já é membro.

**Passos:**
1. Convidar um email que já é membro do workspace
2. Verificar a mensagem de erro

**Resultado esperado:**
- ✅ Erro: "Este usuário já é membro do workspace."

---

### **Cenário 4: Convite Expirado**

**Objetivo:** Testar comportamento com convite expirado.

**Passos:**
1. No Supabase, edite um convite existente:
   ```sql
   UPDATE workspace_invites 
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE id = 'seu-invite-id';
   ```
2. Tente acessar o link do convite
3. Faça login
4. Verifique a mensagem de erro

**Resultado esperado:**
- ✅ Mensagem: "Este convite expirou."

---

### **Cenário 5: Email Diferente do Convite**

**Objetivo:** Testar quando o email logado não bate com o email do convite.

**Passos:**
1. Crie um convite para: `convidado@exemplo.com`
2. Faça login com outro email: `outro@exemplo.com`
3. Tente acessar o link do convite
4. Verifique a mensagem de erro

**Resultado esperado:**
- ✅ Erro: "Este convite foi enviado para convidado@exemplo.com, mas você está logado como outro@exemplo.com."

---

### **Cenário 6: Aceitar Convite Direto na Página**

**Objetivo:** Testar aceitar convite pela página `/invite/[token]` (não pelo callback).

**Passos:**
1. Receba o email de convite
2. Clique no link (estando logado ou não)
3. Se não estiver logado, faça login
4. Na página do convite, clique em **Aceitar Convite**
5. Verifique o redirecionamento

**Resultado esperado:**
- ✅ Redirecionamento para `/{workspaceSlug}/tasks?invite_accepted=true`

---

### **Cenário 7: Diferentes Roles**

**Objetivo:** Verificar que as roles (admin, member, viewer) são aplicadas corretamente.

**Passos:**
1. Convide 3 pessoas diferentes com roles diferentes:
   - Pessoa 1: `admin`
   - Pessoa 2: `member`
   - Pessoa 3: `viewer`
2. Cada pessoa aceita o convite
3. Verifique as permissões de cada uma

**Verificações:**
- ✅ Admin pode acessar Configurações → Time
- ✅ Admin pode convidar outros membros
- ✅ Member e Viewer aparecem na lista de membros com role correta
- ✅ Permissões estão de acordo com a role

---

## 🔧 Métodos de Teste Rápido

### **Método 1: Teste Manual Completo (Recomendado para validação)**

Use dois navegadores ou uma janela anônima:

1. **Navegador 1 (Convidador):**
   - Login como admin/owner
   - Convidar membro

2. **Navegador 2 ou Janela Anônima (Convidado):**
   - Abrir link do convite
   - Criar conta ou fazer login
   - Verificar redirecionamento

---

### **Método 2: Teste via Supabase (Bypass de Email)**

Para testes rápidos sem depender de email:

1. **Criar convite diretamente no Supabase:**
   ```sql
   INSERT INTO workspace_invites (
     workspace_id,
     email,
     role,
     status,
     expires_at,
     invited_by
   ) VALUES (
     'seu-workspace-id',
     'teste@exemplo.com',
     'member',
     'pending',
     NOW() + INTERVAL '7 days',
     'seu-user-id'
   ) RETURNING id;
   ```

2. **Usar o ID retornado no link:**
   ```
   http://localhost:3000/invite/{id-retornado}
   ```

3. **Testar o fluxo normalmente**

---

### **Método 3: Teste de Email (Verificar Template)**

Para testar apenas o envio de email:

**Via API:**
```bash
curl "http://localhost:3000/api/test-email?email=seu-email@exemplo.com"
```

**Via Script:**
```bash
npx tsx scripts/test-email.ts seu-email@exemplo.com
```

---

## ✅ Checklist de Validação

Após cada teste, verifique:

### **Funcionalidades:**
- [ ] Email foi enviado/recebido
- [ ] Link do convite funciona
- [ ] Página de convite exibe informações corretas (workspace, inviter, role)
- [ ] Aceitar convite funciona (tanto automático quanto manual)
- [ ] Redirecionamento para workspace correto
- [ ] Workspace aparece no seletor após aceitar
- [ ] Membro aparece na lista de membros (Configurações → Time)
- [ ] Role está correta
- [ ] Permissões funcionam de acordo com a role

### **Tratamento de Erros:**
- [ ] Convite já aceito → mensagem apropriada
- [ ] Convite expirado → mensagem de erro
- [ ] Email diferente → mensagem de erro
- [ ] Usuário já membro → erro ao convidar novamente
- [ ] Convite inválido → erro apropriado

### **Performance e UX:**
- [ ] Loading states funcionam
- [ ] Mensagens de sucesso aparecem
- [ ] Não há erros no console
- [ ] Redirecionamento é rápido
- [ ] Cache é atualizado corretamente

---

## 🐛 Troubleshooting Comum

### **Problema: Workspace não aparece após aceitar convite**

**Soluções:**
1. Verificar no Supabase se o membro foi adicionado:
   ```sql
   SELECT * FROM workspace_members 
   WHERE user_id = 'user-id' 
   AND workspace_id = 'workspace-id';
   ```
2. Limpar cache do navegador
3. Fazer logout e login novamente
4. Verificar logs do servidor para erros

### **Problema: Erro ao criar workspace pessoal**

**Soluções:**
1. Verificar se há erro de RLS no Supabase
2. Verificar logs do servidor para detalhes do erro
3. Confirmar que o usuário está autenticado
4. Verificar se o workspace pessoal já existe

### **Problema: Email não chega**

**Soluções:**
1. Verificar pasta de spam
2. Confirmar que `RESEND_API_KEY` está configurada
3. Verificar logs do servidor
4. Testar via `/api/test-email`
5. Verificar dashboard do Resend: https://resend.com/emails

### **Problema: Redirecionamento para workspace incorreto**

**Soluções:**
1. Verificar se `workspaceSlug` está sendo retornado por `acceptInvite`
2. Verificar logs do callback (`/auth/callback`)
3. Confirmar que o slug do workspace existe no banco

---

## 📝 Logs Úteis para Debug

Durante os testes, monitore estes logs:

1. **Console do navegador (F12):**
   - Erros JavaScript
   - Requests de rede
   - Redirecionamentos

2. **Logs do servidor (terminal):**
   - `[Auth Callback]` - logs do callback OAuth
   - `[getUserWorkspaces]` - logs de carregamento de workspaces
   - Erros de Server Actions

3. **Supabase Logs:**
   - Acesse: https://app.supabase.com → Logs
   - Monitore queries e erros de RLS

---

## 🎓 Dicas de Teste Eficiente

1. **Use emails de teste reais:** Serviços como Mailtrap, Mailinator ou emails temporários podem ajudar
2. **Teste em diferentes navegadores:** Chrome, Firefox, Safari
3. **Teste em modo anônimo:** Para simular usuários diferentes
4. **Monitore o banco de dados:** Use Supabase Dashboard para verificar estado em tempo real
5. **Use DevTools:** Network tab para verificar requests, Console para erros
6. **Teste em produção também:** Alguns comportamentos podem ser diferentes

---

## 📚 Recursos Adicionais

- **Documentação de Convites:** `docs/IMPLEMENTACAO_CONVITES.md`
- **Teste de Email:** `docs/TESTE_EMAIL.md`
- **Schema do Banco:** `supabase/schema.sql`
- **API de Teste:** `/api/test-email`

---

**Última atualização:** Dezembro 2024

