# 🔧 Correção: Redirecionamento para Onboarding Após Aceitar Convite

## Problema

Após aceitar um convite e fazer login com Google, o usuário está sendo redirecionado para `/onboarding` em vez de ir para `/home`.

## Causa Raiz

1. **Política RLS:** A política atual de `workspace_members` só permite que admins/owners adicionem membros, mas não permite que usuários aceitem convites inserindo-se no workspace.
2. **Cache/Timing:** Após aceitar o convite, pode haver um delay antes que o workspace seja encontrado pelo layout.
3. **Verificação Prematura:** O layout verifica se há workspaces muito rapidamente, antes do cache atualizar.

## Soluções Implementadas

### 1. Migração SQL: Permitir Aceitar Convites

Criei a migração `supabase/migrations/20241201_allow_users_accept_invites.sql` que adiciona uma política RLS permitindo que usuários aceitem convites:

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

### 2. Melhorias no Layout

Ajustei o layout `app/(main)/layout.tsx` para:
- Aguardar mais tempo e fazer múltiplas tentativas antes de redirecionar para onboarding
- Tentar 3 vezes com delay de 500ms entre cada tentativa

### 3. Melhorias no Callback

Ajustei o callback `app/auth/callback/route.ts` para:
- Revalidar cache após aceitar convite
- Verificar se o workspace foi criado antes de redirecionar
- Adicionar parâmetro `invite_accepted=true` na URL

## Próximos Passos

### 1. Aplicar a Migração SQL

Você precisa executar a migração SQL no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `supabase/migrations/20241201_allow_users_accept_invites.sql`

Ou execute via CLI:

```bash
# Se você tem o Supabase CLI configurado
supabase db push
```

### 2. Verificar se a Migração Anterior Foi Aplicada

Verifique se a migração `20241201_allow_public_invite_read.sql` também foi aplicada. Ela permite leitura pública de convites pendentes.

### 3. Testar o Fluxo

1. Envie um convite para um email
2. Faça login com Google usando esse email
3. Verifique se vai para `/home` em vez de `/onboarding`

## Verificação

Para verificar se as políticas estão corretas, você pode executar no SQL Editor do Supabase:

```sql
-- Verificar políticas de workspace_members
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY policyname;

-- Verificar políticas de workspace_invites
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'workspace_invites'
ORDER BY policyname;
```

## Troubleshooting

Se ainda estiver redirecionando para onboarding:

1. **Verifique os logs do servidor** - Procure por erros relacionados a RLS ou inserção em `workspace_members`
2. **Verifique se a migração foi aplicada** - Veja se a política "Users can accept invites and add themselves" existe
3. **Verifique o console do navegador** - Veja se há erros ao aceitar o convite
4. **Verifique no Supabase** - Veja se o registro foi criado em `workspace_members` após aceitar o convite

