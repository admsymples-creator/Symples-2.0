# Investigação: Dados Mock de Billing e Sincronização

## 🔍 Problemas Encontrados

### 1. **Dados Mock em Settings** ❌
**Arquivo:** `app/(main)/settings/settings-client.tsx`

**Linhas 49-54:** Array `BILLING_HISTORY` com dados hardcoded:
```typescript
const BILLING_HISTORY = [
  { date: "01 Nov 2025", amount: "R$ 97,00", status: "Pago" },
  { date: "01 Out 2025", amount: "R$ 97,00", status: "Pago" },
  { date: "01 Set 2025", amount: "R$ 97,00", status: "Pago" },
];
```

**Linha 750:** Badge hardcoded "Plano Pro"
**Linha 753:** Texto hardcoded "Próxima cobrança em 01 Dez 2025"
**Linha 758:** Valor hardcoded "R$ 97"
**Linha 766:** Uso hardcoded "450 / ilimitado"

### 2. **Cálculo de Dias Restantes** ✅
**Status:** CORRETO

O cálculo está implementado corretamente em:
- `components/layout/Sidebar.tsx` (linhas 132-138)
- `components/home/TrialBanner.tsx` (linhas 55-56)

Ambos usam:
```typescript
const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
```

### 3. **Sincronização de Dados** ⚠️
**Status:** PARCIALMENTE CORRETO

- ✅ API `/api/workspace/subscription` busca dados reais do banco
- ✅ `TrialBanner` busca dados via API
- ✅ `Sidebar` busca dados via API
- ❌ `Settings` ainda usa dados mock

## 📋 Ações Necessárias

1. **Remover dados mock de Settings**
2. **Buscar dados reais de subscription em Settings**
3. **Implementar busca de histórico de faturas (futuro)**
4. **Verificar se há cache que precisa ser invalidado**

## ✅ Verificações Realizadas

- [x] Cálculo de dias restantes está correto
- [x] API de subscription retorna dados do banco
- [x] Sidebar busca dados dinamicamente
- [x] TrialBanner busca dados dinamicamente
- [x] Settings corrigido para buscar dados reais

## 🔧 Correções Aplicadas

1. **Removido array `BILLING_HISTORY` mock**
2. **Implementada busca de dados reais via `getCurrentSubscription`**
3. **Card do plano agora mostra dados dinâmicos:**
   - Nome do plano baseado em `subscriptionData.plan`
   - Preço baseado no plano (R$ 49, R$ 69, R$ 129 ou "Grátis" para trial)
   - Status do trial com data de expiração
4. **Histórico de faturas:** Removido mock, mostra mensagem "em breve" (será implementado quando houver integração com Asaas para buscar faturas)

## 📊 Resumo da Sincronização

### ✅ Componentes Sincronizados:
- `TrialBanner` → Busca via `/api/workspace/subscription`
- `Sidebar` → Busca via `/api/workspace/subscription`
- `Settings` → Busca via `getCurrentSubscription` (Server Action)

### ⚠️ Pendências:
- Histórico de faturas (precisa buscar do Asaas via webhook ou API)
- Próxima data de cobrança (precisa calcular baseado em `subscription_id` do Asaas)

