# Integração Asaas - Guia Rápido

## Arquivos Criados

- `types.ts` - Tipos TypeScript para Asaas
- `client.ts` - Cliente para comunicação com API Asaas
- `plans.ts` - Configuração de planos e valores

## Funcionalidades Implementadas

✅ Criação/atualização de clientes no Asaas
✅ Criação de assinaturas mensais
✅ Suporte a PIX, Cartão de Crédito e Boleto
✅ Webhook para atualização automática de status
✅ Cancelamento de assinaturas

## Como Usar

### 1. Configurar Variáveis de Ambiente

```env
ASAAS_API_URL=https://api.asaas.com/v3
ASAAS_API_KEY=sua_chave_api
ASAAS_WEBHOOK_TOKEN=token_secreto_opcional
```

### 2. Chamar updateSubscription

```typescript
const result = await updateSubscription(
  workspaceId,
  'pro', // plano
  'PIX' // método de pagamento
);
```

### 3. Configurar Webhook no Asaas

URL: `https://seu-dominio.com/api/webhooks/asaas`

## Notas Importantes

- A API do Asaas usa o header `access_token` para autenticação
- O `externalReference` na assinatura deve ser o ID do workspace
- Webhooks atualizam automaticamente o `subscription_status` no banco

