# Design do Plano Agency - Multiplos Workspaces

Este documento registra a decisao tomada para o plano Agency e o modelo implementado.

---

## Objetivo
Permitir que agencias gerenciem multiplos workspaces com uma unica assinatura, mantendo o modelo atual de planos por workspace.

---

## Decisao
Modelo hibrido (account-level para Agency + workspace-level para demais planos).

- `agency` fica no nivel do usuario (profiles.account_plan = 'agency').
- `pessoal`, `pro`, `business` continuam no nivel do workspace.
- Trial ocorre somente para workspaces `pro` em `subscription_status = 'trialing'`.
- Usuarios com `agency` nao veem banner de trial.

---

## Motivos
- Simplicidade de implementacao agora.
- Evita nova entidade (agencies) no curto prazo.
- Mantem compatibilidade com fluxo atual de cobranca por workspace.
- Permite evolucao futura para tabela agencies se necessario.

---

## Schema e migracoes
- `profiles.account_plan` (texto, aceita 'agency').
- `workspaces.plan` inclui `pessoal | pro | business | agency`.
- `workspaces.subscription_status` alinhado para `trialing | active | past_due | canceled`.

Migracoes:
- `supabase/migrations/20260105212654_align_subscription_status_trialing.sql`
- `supabase/migrations/20260105214414_add_agency_plan.sql`
- `supabase/migrations/20260105213000_add_account_plan_to_profiles.sql`

---

## Regras atuais
- Pessoal: 1 workspace pessoal.
- Pro/Business: 2 workspaces (1 pessoal + 1 profissional).
- Agency: varios workspaces (a combinar).
- Limite de membros por workspace nao se aplica quando `account_plan = 'agency'`.

---

## Superadmin
- O superadmin altera planos no nivel correto:
  - `agency` -> grava em `profiles.account_plan`.
  - outros planos -> limpa `profiles.account_plan` e atualiza `workspaces.plan`.

---

## Proximos passos (opcional)
- Definir formalmente limite de workspaces para Agency.
- Criar UI dedicada para gerenciar workspaces de Agency.
- Revisar precificacao com base no uso real.

---

Ultima atualizacao: 2026-01-05
Status: Implementado (modelo hibrido)
