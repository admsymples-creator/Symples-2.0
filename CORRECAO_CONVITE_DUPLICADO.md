# ✅ Correção: Erro 500 ao Tentar Convidar Quando Já Existe Convite

## Problema Identificado

O erro 500 estava ocorrendo quando você tentava enviar um convite para um email que já tinha um convite pendente. Isso acontecia porque:

1. Existe uma constraint `UNIQUE(workspace_id, email)` na tabela `workspace_invites`
2. Quando tentava criar um novo convite para um email que já tinha um convite, o banco de dados rejeitava
3. O erro não estava sendo tratado adequadamente, causando erro 500

## ✅ Correções Aplicadas

### 1. Verificação Melhorada de Convites Existentes

Agora o sistema verifica se já existe um convite (de qualquer status) antes de tentar criar um novo:

```typescript
// Verifica todos os status, não apenas 'pending'
const { data: existingInvite } = await supabase
  .from("workspace_invites")
  .select("id, status")
  .eq("workspace_id", workspaceId)
  .eq("email", normalizedEmail)
  .maybeSingle();
```

### 2. Mensagens de Erro Mais Claras

Agora você verá mensagens específicas dependendo do status do convite existente:

- **Convite pendente**: "Já existe um convite pendente para este email. Você pode cancelar o convite existente antes de criar um novo."
- **Convite aceito**: "Este email já foi aceito neste workspace. Verifique se o usuário já é membro."
- **Outros status**: "Já existe um convite para este email (status: ...). Você pode cancelar o convite existente antes de criar um novo."

### 3. Tratamento de Erro de Constraint

Se mesmo assim a constraint for violada (caso raro), o erro é tratado especificamente:

```typescript
if (insertError.code === '23505') { // Unique violation
  throw new Error("Já existe um convite para este email neste workspace. Verifique a lista de convites pendentes.");
}
```

## 🎯 Como Funciona Agora

1. ✅ O sistema verifica se já existe um convite antes de criar um novo
2. ✅ Se existir, mostra uma mensagem clara explicando o problema
3. ✅ Você pode cancelar o convite existente e criar um novo
4. ✅ Não mais erro 500 - apenas mensagens de erro claras

## 📝 Próximos Passos

Agora que o problema está resolvido:

1. ✅ Ao tentar convidar um email que já tem convite, você verá uma mensagem clara
2. ✅ Você pode cancelar convites pendentes pela interface
3. ✅ O sistema funciona corretamente mesmo se houver convites antigos no banco

## 💡 Dica

Se você encontrar convites antigos no banco de dados, pode:
- Cancelá-los pela interface de configurações
- Ou excluí-los diretamente no banco (como você fez)
- O sistema agora vai prevenir que isso aconteça novamente mostrando mensagens claras


