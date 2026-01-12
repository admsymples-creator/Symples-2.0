# Guia de Teste do Billing (Asaas)

Este guia cobre a configuracao do Asaas, testes de assinaturas e validacoes do fluxo.

## Pre-requisitos
- Conta no Asaas Sandbox.
- Workspace criado no sistema.
- Usuario com role owner/admin no workspace.

## Configuracao inicial

### 1) Chave de API
No painel do Asaas Sandbox:
- Integracoes -> Chaves API -> Gerar chave.

### 2) Variaveis de ambiente
Edite `.env.local`:

```env
ASAAS_API_KEY=sua_chave_api_aqui
# ASAAS_API_URL=https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=seu_token_secreto_aqui
```

Notas:
- Em development usa sandbox automaticamente.
- Em production usa `https://api.asaas.com/v3`.

### 3) Reinicie o servidor

```bash
npm run dev
```

---

## Testes de funcionalidade

### Teste 1: Pagina de billing
Passos:
1. Acesse `/billing`.
2. Verifique os planos:
   - Pessoal (R$ 49)
   - Pro (R$ 69)
   - Business (R$ 129)
   - Agency (a combinar)

Esperado:
- Pagina carrega sem erros.
- Plano atual destacado.

### Teste 2: Selecionar plano (PIX)
Passos:
1. Clique em "Selecionar" em um plano (ex: Pessoal).
2. Escolha PIX e confirme.

Esperado:
- Assinatura criada no Asaas.
- Workspace atualizado no banco.

SQL:
```sql
SELECT id, name, plan, subscription_status, subscription_id, member_limit
FROM workspaces
WHERE id = 'seu-workspace-id';
```

### Teste 3: Cartao e Boleto
Repita o Teste 2 escolhendo Cartao e Boleto.

### Teste 4: Troca de plano
1. Com um plano ativo, selecione outro.
2. Confirme o metodo de pagamento.

Esperado:
- Assinatura antiga cancelada.
- Nova assinatura criada.
- Workspace atualizado.

---

## Regras de plano e trial
- Trial: apenas `plan = 'pro'` com `subscription_status = 'trialing'` (14 dias).
- Banner de trial nao aparece para usuarios com `account_plan = 'agency'`.
- Limites de membros:
  - Pessoal: 1
  - Pro: 5
  - Business: 15
  - Agency: sem limite (excecao por account_plan)

---

## Webhook

### Configurar webhook no Asaas
- URL local: `https://xxxx.ngrok.io/api/webhooks/asaas`
- URL prod: `https://app.symples.org/api/webhooks/asaas`
- Token (opcional): mesmo valor de `ASAAS_WEBHOOK_TOKEN`.

Eventos recomendados:
- `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`
- `SUBSCRIPTION_*`

### Testar evento
Exemplo curl:

```bash
curl -X POST https://seu-dominio.com/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "x-asaas-webhook-token: seu-token" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_xxxxx",
      "subscription": "sub_xxxxx",
      "customer": "cus_xxxxx",
      "value": 49.00,
      "externalReference": "seu-workspace-id"
    }
  }'
```

Esperado:
- Webhook retorna 200.
- Workspace atualizado para `active`.

---

## Problemas comuns

### 401 Unauthorized
- `ASAAS_API_KEY` invalida ou do ambiente errado.

### "Apenas owners/admins podem alterar o plano"
- Verifique a role do usuario no workspace.

### Assinatura criada mas workspace nao atualiza
- Verifique logs e RLS no Supabase.
- Ajuste manualmente se necessario:

```sql
UPDATE workspaces
SET plan = 'Pessoal', subscription_status = 'active', member_limit = 1
WHERE id = 'seu-workspace-id';
```

---

Ultima atualizacao: 2026-01-05

