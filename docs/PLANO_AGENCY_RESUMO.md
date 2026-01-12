# Plano Agency - Resumo Executivo

## Objetivo
Plano que permite gerenciar multiplos workspaces (clientes) com uma unica assinatura, mas sem quebrar o modelo atual por workspace.

---

## Decisao atual (implementado)
Modelo hibrido:
- Planos por workspace continuam para `pessoal`, `pro`, `business`.
- Plano `agency` fica no nivel do usuario (profiles.account_plan = 'agency').
- Usuario com `agency` pode criar varios workspaces (limite a combinar).
- Banner de trial aparece apenas quando o workspace esta em `trialing` e o plano do workspace e `pro`.
- Usuario com `agency` nao deve ver banner de trial.

---

## Impacto no schema
- `profiles.account_plan` (texto, aceita 'agency').
- `workspaces.plan` continua com `pessoal`, `pro`, `business`, `agency` (para compatibilidade UI/admin).
- `workspaces.subscription_status` alinhado para `trialing | active | past_due | canceled`.

---

## Regras de negocio (resumo)
- Pessoal: 1 workspace pessoal.
- Pro/Business: 2 workspaces (1 pessoal + 1 profissional).
- Agency: varios workspaces (a combinar), sem limite de membros no workspace.
- Trial: sempre no plano `pro` do workspace.

---

## Superadmin
- Ao editar plano no superadmin:
  - Se escolher `agency`, gravar em `profiles.account_plan`.
  - Se escolher outro plano, limpar `profiles.account_plan` e atualizar `workspaces.plan` do workspace principal.

---

## Migracoes relacionadas
- `supabase/migrations/20260105212654_align_subscription_status_trialing.sql`
- `supabase/migrations/20260105214414_add_agency_plan.sql`
- `supabase/migrations/20260105213000_add_account_plan_to_profiles.sql`

---

## Observacoes
- Esse modelo evita nova tabela de agencies agora, mas mantem abertura para evoluir no futuro.
- Os limites por workspace seguem o plano do workspace, exceto quando o usuario tem `agency`.

