# Integração com Asaas

## Configuração

### 1. Variáveis de Ambiente

O sistema detecta automaticamente o ambiente:
- **Desenvolvimento**: Usa `https://sandbox.asaas.com/api/v3` automaticamente
- **Produção**: Usa `https://api.asaas.com/v3` automaticamente

Você pode sobrescrever manualmente definindo `ASAAS_API_URL` no `.env.local`:

```env
# Asaas API (obrigatório)
ASAAS_API_KEY=sua_chave_api_aqui

# Opcional: Sobrescrever URL (padrão é detectado automaticamente)
# ASAAS_API_URL=https://sandbox.asaas.com/api/v3  # Para forçar sandbox
# ASAAS_API_URL=https://api.asaas.com/v3          # Para forçar produção

# Opcional: Token para validar webhooks (recomendado)
ASAAS_WEBHOOK_TOKEN=seu_token_secreto_aqui
```

### 2. Obter Chave de API do Asaas

#### Para Desenvolvimento (Sandbox):
1. Acesse [Asaas Sandbox](https://sandbox.asaas.com/)
2. Crie uma conta de teste
3. Vá em **Integrações** → **Chaves API**
4. Clique em **Gerar chave de API**
5. Copie a chave e adicione no `.env.local`

#### Para Produção:
1. Acesse sua conta no [Asaas](https://www.asaas.com/)
2. Vá em **Integrações** → **Chaves API**
3. Clique em **Gerar chave de API**
4. Copie a chave e adicione nas variáveis de ambiente da Vercel

**⚠️ IMPORTANTE**: Sandbox e Produção usam chaves diferentes!

### 3. Configurar Webhook no Asaas

1. No painel do Asaas (sandbox ou produção), vá em **Integrações** → **Webhooks**
2. Adicione uma nova URL de webhook:
   - **URL**: 
     - Sandbox: `https://seu-dominio-preview.vercel.app/api/webhooks/asaas`
     - Produção: `https://app.symples.org/api/webhooks/asaas`
   - **Token** (opcional): Configure um token secreto e adicione em `ASAAS_WEBHOOK_TOKEN`
   - **Eventos**: Selecione todos os eventos de `PAYMENT_*` e `SUBSCRIPTION_*`

### 4. Ambientes

- **Sandbox**: Ambiente de testes, não processa pagamentos reais
- **Produção**: Ambiente real, processa pagamentos reais
- **Detecção Automática**: O sistema usa sandbox em `development` e produção em `production`

## Fluxo de Assinatura

1. **Usuário escolhe plano** na página `/billing`
2. **Seleciona método de pagamento** (PIX, Cartão ou Boleto)
3. **Sistema cria cliente no Asaas** (se não existir)
4. **Cria assinatura no Asaas** com:
   - Valor do plano
   - Ciclo mensal
   - `externalReference` = ID do workspace
5. **Atualiza workspace** com `subscription_id` e `subscription_status`
6. **Webhook recebe eventos** e atualiza status automaticamente

## Eventos do Webhook

O webhook processa os seguintes eventos:

- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `status = 'active'`
- `PAYMENT_OVERDUE` → `status = 'past_due'`
- `PAYMENT_REFUNDED` → `status = 'past_due'`
- `SUBSCRIPTION_*` → Atualiza status da assinatura

## Testando a Integração

1. Configure as variáveis de ambiente
2. Escolha um plano na página `/billing`
3. Selecione método de pagamento
4. Para PIX: O QR Code será gerado pelo Asaas (implementar se necessário)
5. Para Cartão: Redireciona para checkout do Asaas
6. Para Boleto: O boleto será gerado pelo Asaas

## Próximos Passos

- [ ] Implementar página de checkout para PIX (mostrar QR Code)
- [ ] Implementar página de sucesso após pagamento
- [ ] Adicionar notificações por email quando pagamento confirmado
- [ ] Dashboard de faturas na página de billing

