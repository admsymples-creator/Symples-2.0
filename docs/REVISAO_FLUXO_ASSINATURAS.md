# Revisao do Fluxo de Assinaturas

## Fluxo completo (estado atual)

### 1) Criacao de workspace (onboarding)
- `createWorkspace` aplica reverse trial:
  - `plan = 'pro'`
  - `subscription_status = 'trialing'`
  - `trial_ends_at = NOW() + 14 dias`
  - `member_limit = 5`

### 2) Migration de workspaces existentes
- Normaliza valores antigos (`trial` -> `trialing`, `cancelled` -> `canceled`).
- Workspaces antigos (>30 dias) ficam `status = 'active'`.
- Workspaces novos (<30 dias) ficam `status = 'trialing'`.

### 3) Gatekeeper (controle de acesso)
- `checkWorkspaceAccess`:
  - `status = 'active'` -> permite
  - `trial_ends_at < NOW()` e `status != 'active'` -> bloqueia escrita
  - demais casos -> permite
- Aplicado em:
  - `createTask`
  - `createTransaction`
  - `/api/ai/chat`
  - `/api/audio/process`

### 4) Limites de membros
- `getPlanLimits`:
  - Pessoal: 1 membro
  - Pro: 5 membros
  - Business: 15 membros
  - Agency: sem limite
- Excecao: `account_plan = 'agency'` ignora limite no invite.

### 5) Banner de trial
- Mostra apenas se:
  - `subscription_status = 'trialing'`
  - `plan = 'pro'`
  - usuario nao tem `account_plan = 'agency'`
- Cores baseadas em dias restantes:
  - > 3 dias: azul
  - <= 3 dias: amarelo
  - expirado: vermelho

### 6) Pagina de billing
- Mostra planos disponiveis.
- Indica plano atual (considera `account_plan` quando for Agency).
- Permite selecionar novo plano.

---

## Checklist de validacao
- [x] Novos workspaces recebem reverse trial (Pro por 14 dias)
- [x] Workspaces antigos (>30 dias) marcados como `active`
- [x] Gatekeeper bloqueia escrita quando trial expira
- [x] Gatekeeper permite leitura mesmo com trial expirado
- [x] Limites respeitam plano e excecao de Agency
- [x] Banner aparece apenas para trial do Pro
- [x] Banner nao aparece para Agency
- [x] Pagina de billing permite selecionar planos

---

## Fluxo de estados

```
NOVO WORKSPACE
  -> plan='pro', status='trialing', trial_ends_at=+14d
  -> [14 dias]
  -> status='trialing', trial_ends_at < NOW()
  -> Gatekeeper bloqueia escrita
  -> Usuario escolhe plano em /billing
  -> status='active' (via updateSubscription)
```

```
WORKSPACE ANTIGO (>30 dias)
  -> [Migration executa]
  -> status='active', trial_ends_at=NULL
  -> Sem banner, sem bloqueios
```

---

## Integracao com Asaas
- Cliente Asaas detecta ambiente (sandbox/produca o).
- Cria/atualiza clientes e assinaturas mensais.
- Cancela assinaturas antigas ao trocar de plano.
- Webhook para atualizacao de status.

Ambientes:
- Sandbox: `https://sandbox.asaas.com/api/v3`
- Producao: `https://api.asaas.com/v3`

---

## Proximos passos (opcional)
- Testar fluxo completo (trial -> expiracao -> upgrade).
- Revisar dashboard de faturas na pagina de billing.
