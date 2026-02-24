"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/admin/data-table/DataTableColumnHeader"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { AdminAuditLogRow } from "@/types/admin"

const actionLabels: Record<string, { label: string; color: string }> = {
  support_login: { label: "Support Login", color: "bg-orange-100 text-orange-700 border-orange-200" },
  trial_invite: { label: "Trial Invite", color: "bg-blue-100 text-blue-700 border-blue-200" },
  plan_change: { label: "Plan Change", color: "bg-purple-100 text-purple-700 border-purple-200" },
}

export const auditLogsColumns: ColumnDef<AdminAuditLogRow>[] = [
  {
    accessorKey: "action",
    header: () => (
      <DataTableColumnHeader title="Acao" />
    ),
    cell: ({ row }) => {
      const action = row.original.action
      const config = actionLabels[action] || {
        label: action,
        color: "bg-gray-100 text-gray-700 border-gray-200",
      }
      return (
        <Badge variant="outline" className={config.color}>
          {config.label}
        </Badge>
      )
    },
  },
  {
    id: "admin",
    header: () => (
      <DataTableColumnHeader title="Admin" />
    ),
    cell: ({ row }) => {
      const profile = row.original.admin_profile
      if (!profile) return <span className="text-muted-foreground">-</span>
      return (
        <div className="text-xs">
          <div className="font-medium">{profile.full_name || "Sem nome"}</div>
          <div className="text-muted-foreground">{profile.email}</div>
        </div>
      )
    },
  },
  {
    id: "target",
    header: () => (
      <DataTableColumnHeader title="Alvo" />
    ),
    cell: ({ row }) => {
      const details = row.original.details
      if (!details) return <span className="text-muted-foreground">-</span>
      const targetEmail = (details.target_email as string) || null
      const targetUserId = (details.target_user_id as string) || null
      return (
        <div className="text-xs">
          {targetEmail && (
            <div className="text-muted-foreground">{targetEmail}</div>
          )}
          {!targetEmail && targetUserId && (
            <div className="text-muted-foreground font-mono truncate max-w-[140px]">
              {targetUserId}
            </div>
          )}
          {!targetEmail && !targetUserId && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
  },
  {
    id: "details",
    header: () => (
      <DataTableColumnHeader title="Detalhes" />
    ),
    cell: ({ row }) => {
      const details = row.original.details
      if (!details) return <span className="text-muted-foreground">-</span>

      const reason = (details.reason as string) || null
      const trialPlan = (details.trial_plan as string) || null
      const trialDays = (details.trial_days as number) || null

      return (
        <div className="text-xs text-muted-foreground max-w-[200px]">
          {reason && <div className="truncate">Motivo: {reason}</div>}
          {trialPlan && (
            <div>
              Plano: {trialPlan}
              {trialDays ? ` (${trialDays}d)` : ""}
            </div>
          )}
          {!reason && !trialPlan && (
            <span className="font-mono text-[11px] truncate block">
              {JSON.stringify(details).slice(0, 60)}...
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: () => (
      <DataTableColumnHeader
        title="Data"
        sortKey="created_at"
      />
    ),
    cell: ({ row }) => {
      const date = row.original.created_at
      return (
        <span className="text-muted-foreground text-xs">
          {date
            ? format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR })
            : "-"}
        </span>
      )
    },
  },
]
