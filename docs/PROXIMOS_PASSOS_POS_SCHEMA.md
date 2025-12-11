# 🎯 PRÓXIMOS PASSOS - Após Schema V2.1

## ✅ CONCLUÍDO

- ✅ Schema v2.1 executado em DEV e PROD
- ✅ Todos os novos campos adicionados
- ✅ Campos sincronizados entre DEV e PROD

---

## 🔄 PRÓXIMOS PASSOS (Ordem de Prioridade)

### 1. ✅ VALIDAR SINCRONIZAÇÃO DEV/PROD

Execute o script de comparação em ambos os ambientes:

1. **No DEV:**
   - Execute `supabase/SCRIPT_COMPARAR_DEV_PROD.sql`
   - Anote os resultados

2. **No PROD:**
   - Execute `supabase/SCRIPT_COMPARAR_DEV_PROD.sql`
   - Compare com os resultados do DEV

3. **Resultado esperado:** Valores devem ser **idênticos** ✅

---

### 2. 🔧 ATUALIZAR TIPOS TYPESCRIPT

**Opção A: Regenerar tipos do Supabase (Recomendado)**

1. No terminal:
   ```bash
   npx supabase gen types typescript --project-id seu-project-id-prod > types/database.types.ts
   ```

2. Ou use o Supabase CLI se tiver configurado

**Opção B: Atualizar manualmente**

Atualizar `types/database.types.ts` para incluir:
- `profiles.whatsapp`
- `workspaces.trial_ends_at`
- `workspaces.subscription_status`
- `workspaces.subscription_id`
- Status 'review' em tasks

---

### 3. 📝 ATUALIZAR CÓDIGO QUE USA STATUS

Verificar onde `status` de tasks é usado:

- [ ] `app/(main)/tasks/page.tsx`
- [ ] `lib/actions/tasks.ts`
- [ ] `components/tasks/*.tsx`
- [ ] Qualquer filtro ou validação de status

**Ação:** Adicionar 'review' como opção válida onde necessário.

---

### 4. 💳 IMPLEMENTAR LÓGICA DE TRIAL/SUBSCRIPTION

Criar Server Actions para:

- [ ] `lib/actions/subscriptions.ts`
  - `checkTrialStatus(workspaceId)` - Verificar se trial está ativo
  - `updateSubscriptionStatus(workspaceId, status)` - Atualizar status
  - `getWorkspaceSubscription(workspaceId)` - Buscar info de subscription

- [ ] Adicionar verificação de trial em:
  - Criação de workspaces (já tem default)
  - Acesso a features premium
  - Webhooks de pagamento (Stripe/Pagar.me)

---

### 5. 📱 IMPLEMENTAR CAMPO WHATSAPP

- [ ] Atualizar formulário de perfil para incluir campo WhatsApp
- [ ] Atualizar `lib/actions/profiles.ts` para permitir editar whatsapp
- [ ] Integrar com onboarding (capturar WhatsApp)

---

### 6. 🔍 ATUALIZAR DASHBOARD/COMPONENTES

- [ ] Verificar se componentes precisam atualizar tipos
- [ ] Testar criação de tarefas com status 'review'
- [ ] Verificar se filtros funcionam com novo status

---

### 7. 🧪 TESTAR FUNCIONALIDADES

**Testes básicos:**
- [ ] Criar workspace → Verificar se trial_ends_at é criado
- [ ] Criar tarefa com status 'review' → Verificar se funciona
- [ ] Editar perfil → Adicionar WhatsApp → Verificar se salva
- [ ] Verificar se RLS está funcionando com novos campos

---

## 📋 CHECKLIST RESUMIDO

- [ ] Validar sincronização DEV/PROD
- [ ] Atualizar tipos TypeScript
- [ ] Atualizar código que usa status
- [ ] Criar Server Actions de subscription
- [ ] Implementar campo WhatsApp no perfil
- [ ] Testar funcionalidades novas

---

## 🎯 ORDEM RECOMENDADA

1. ✅ **Validar sincronização** (5 min)
2. ✅ **Atualizar tipos TypeScript** (10 min)
3. ✅ **Atualizar código de status** (30 min)
4. ⏭️ **Implementar trial/subscription** (2h - pode deixar para depois)
5. ⏭️ **Implementar WhatsApp** (1h - pode deixar para depois)
6. ✅ **Testar** (30 min)

---

**Status:** Pronto para começar implementação funcional! 🚀

