# Revisão do Fluxo de Assinaturas

## ✅ Fluxo Completo Verificado

### 1. **Criação de Workspace (Onboarding)**
- ✅ `createWorkspace` aplica Reverse Trial:
  - `plan = 'business'`
  - `subscription_status = 'trialing'`
  - `trial_ends_at = NOW() + 14 dias`
  - `member_limit = 15`

### 2. **Migration de Workspaces Existentes**
- ✅ Atualiza valores antigos ('trial' → 'trialing', 'cancelled' → 'canceled')
- ✅ Workspaces antigos (>30 dias) → `status = 'active'` (sem banner)
- ✅ Workspaces novos (<30 dias) → `status = 'trialing'` com 14 dias
- ⚠️ **POTENCIAL MELHORIA**: Ordem pode ser otimizada (ver abaixo)

### 3. **Gatekeeper (Controle de Acesso)**
- ✅ `checkWorkspaceAccess` verifica:
  - Se `status = 'active'` → sempre permite
  - Se `trial_ends_at < NOW()` E `status != 'active'` → bloqueia
  - Caso contrário → permite
- ✅ Aplicado em:
  - `createTask` (tarefas de workspace)
  - `createTransaction`
  - `/api/ai/chat`
  - `/api/audio/process`

### 4. **Limites de Membros**
- ✅ `getPlanLimits` retorna:
  - Starter: 1 membro
  - Pro: 5 membros
  - Business: 15 membros
  - **Exceção**: Se `status = 'trialing'` → sempre 15 (Business)
- ✅ `inviteMember` verifica limite antes de criar convite

### 5. **Banner de Trial**
- ✅ Mostra apenas se `subscription_status = 'trialing'`
- ✅ Cores baseadas em dias restantes:
  - > 3 dias: Azul
  - ≤ 3 dias: Amarelo
  - Expirado: Vermelho

### 6. **Página de Billing**
- ✅ Mostra planos disponíveis
- ✅ Indica plano atual
- ✅ Permite selecionar novo plano

---

## ⚠️ Problemas Identificados e Correções

### Problema 1: Ordem na Migration
**Situação**: A migration marca NULL como 'trialing' primeiro, depois marca antigos como 'active'.

**Impacto**: Baixo - funciona, mas pode ser mais eficiente.

**Solução**: Já corrigido na migration atual (linhas 51-65 tratam workspaces antigos antes de dar trial aos novos).

### Problema 2: Workspaces Antigos com Trial
**Situação**: Workspaces criados há mais de 30 dias ainda podem ter `status = 'trialing'` se a migration não foi executada.

**Solução**: Script de correção criado (`20251231090000_fix_old_workspaces_subscription.sql`)

---

## ✅ Checklist de Validação

- [x] Novos workspaces recebem Reverse Trial (Business por 14 dias)
- [x] Workspaces antigos (>30 dias) são marcados como 'active'
- [x] Gatekeeper bloqueia escrita quando trial expira
- [x] Gatekeeper permite leitura mesmo com trial expirado (Soft Lock)
- [x] Limites de membros respeitam plano e exceção de trial
- [x] Banner aparece apenas para workspaces em trial
- [x] Banner não aparece para workspaces antigos
- [x] Página de billing permite selecionar planos

---

## 🔄 Fluxo de Estados

```
NOVO WORKSPACE
  ↓
plan='business', status='trialing', trial_ends_at=+14d
  ↓
[14 dias se passam]
  ↓
status='trialing', trial_ends_at < NOW()
  ↓
Gatekeeper bloqueia escrita
  ↓
Usuário escolhe plano em /billing
  ↓
status='active' (via updateSubscription)
```

```
WORKSPACE ANTIGO (>30 dias)
  ↓
[Migration executa]
  ↓
status='active', trial_ends_at=NULL
  ↓
Sem banner, sem bloqueios
```

---

### 7. **Integração com Asaas**
- ✅ Cliente Asaas configurado com detecção automática de ambiente (sandbox/produção)
- ✅ Criação/atualização de clientes no Asaas
- ✅ Criação de assinaturas mensais (PIX, Cartão, Boleto)
- ✅ Cancelamento de assinaturas antigas ao trocar de plano
- ✅ Webhook para atualização automática de status
- ✅ Modal de seleção de método de pagamento
- ✅ Redirecionamento para checkout (cartão de crédito)

**Ambientes:**
- **Sandbox**: Detectado automaticamente em `development` → `https://sandbox.asaas.com/api/v3`
- **Produção**: Detectado automaticamente em `production` → `https://api.asaas.com/v3`

---

## 📝 Próximos Passos Recomendados

1. ✅ **Executar script de correção** para workspaces antigos que já foram migrados
2. ✅ **Testar fluxo completo**:
   - Criar novo workspace → verificar trial
   - Esperar expiração → verificar bloqueio
   - Escolher plano → verificar ativação
3. ✅ **Integração com gateway de pagamento** (Asaas implementado)
4. **Melhorias futuras**:
   - [ ] Página de checkout para PIX (mostrar QR Code)
   - [ ] Página de sucesso após pagamento
   - [ ] Notificações por email quando pagamento confirmado
   - [ ] Dashboard de faturas na página de billing

