# 🔧 Solução: Redirecionamento para Onboarding Após Aceitar Convite

## Problema Identificado

Após aceitar um convite e fazer login, o usuário está sendo redirecionado para `/onboarding` em vez de `/home`.

## Causa Principal

A política RLS atual de `workspace_members` só permite que **admins/owners** adicionem membros, mas **não permite que usuários aceitem convites** inserindo-se no workspace.

## Solução

### 1. ✅ Migração SQL Criada

Criei o arquivo `supabase/migrations/20241201_allow_users_accept_invites.sql` que adiciona uma política RLS permitindo que usuários aceitem convites.

### 2. ⚠️ AÇÃO NECESSÁRIA: Aplicar a Migração SQL

**Você precisa executar esta migração no Supabase:**

#### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Copie e cole o conteúdo de `supabase/migrations/20241201_allow_users_accept_invites.sql`
5. Clique em **Run**

#### Opção B: Via Supabase CLI

```bash
supabase db push
```

### 3. ✅ Código Ajustado

Já ajustei:
- ✅ Layout para aguardar mais tempo antes de redirecionar
- ✅ Callback para revalidar cache após aceitar convite
- ✅ Função `getInviteDetails` para melhor tratamento de erros
- ✅ Logging melhorado para diagnóstico

## Conteúdo da Migração

A migração cria esta política RLS:

```sql
CREATE POLICY "Users can accept invites and add themselves"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_invites
            WHERE workspace_invites.workspace_id = workspace_members.workspace_id
            AND workspace_invites.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
            AND workspace_invites.status = 'pending'
            AND (workspace_invites.expires_at IS NULL OR workspace_invites.expires_at > NOW())
            AND workspace_members.user_id = auth.uid()
        )
    );
```

Esta política permite que um usuário se adicione ao workspace **apenas se**:
- ✅ Tiver um convite válido pendente
- ✅ O email do convite bater com o email do usuário logado
- ✅ O convite não estiver expirado
- ✅ Estiver se adicionando a si mesmo (user_id = auth.uid())

## Verificação

Após aplicar a migração, você pode verificar se a política foi criada:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'workspace_members'
AND policyname = 'Users can accept invites and add themselves';
```

## Teste

1. Aplique a migração SQL no Supabase
2. Envie um novo convite
3. Faça login com Google usando o email do convite
4. Verifique se agora vai para `/home` em vez de `/onboarding`

## Se Ainda Não Funcionar

1. **Verifique os logs do servidor** - Procure por erros de RLS ao aceitar convite
2. **Verifique no Supabase** - Veja se o registro foi criado em `workspace_members`
3. **Verifique as políticas RLS** - Use a query SQL acima para confirmar que a política existe


