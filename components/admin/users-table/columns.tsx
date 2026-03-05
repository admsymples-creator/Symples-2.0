"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/admin/data-table/DataTableColumnHeader"
import { AdminSupportLoginButton } from "@/components/admin/AdminSupportLoginButton"
import { AdminUserPlanActions } from "@/components/admin/AdminUserPlanActions"
import { getDisplayPlanName, getPlanLimits } from "@/lib/utils/subscription-helpers"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { AdminUserRow } from "@/types/admin"

function getRoleLabel(user: AdminUserRow): string {
  const role = user.primaryWorkspace
    ? "owner"
    : user.primaryMembership?.role || null
  switch (role) {
    case "owner":
      return "Owner"
    case "admin":
      return "Admin"
    case "member":
      return "Membro"
    case "viewer":
      return "Visualizador"
    default:
      return "-"
  }
}

export const usersColumns: ColumnDef<AdminUserRow>[] = [
  {
    accessorKey: "full_name",
    header: () => (
      <DataTableColumnHeader title="Usuario" sortKey="full_name" />
    ),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-gray-100">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="text-xs">
              {user.full_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {user.full_name || "Sem nome"}
            </div>
            <div className="text-muted-foreground text-xs truncate">
              {user.email}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    id: "role",
    header: () => (
      <DataTableColumnHeader title="Cargo" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{getRoleLabel(row.original)}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: () => (
      <DataTableColumnHeader
        title="Cadastro"
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
  {
    accessorKey: "whatsapp",
    header: () => (
      <DataTableColumnHeader title="WhatsApp" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.whatsapp || "-"}
      </span>
    ),
  },
  {
    id: "trial",
    header: () => (
      <DataTableColumnHeader title="Trial?" />
    ),
    cell: ({ row }) => {
      const ws = row.original.primaryWorkspace
      if (!ws) return <span className="text-muted-foreground">-</span>
      const isTrialing =
        ws.subscription_status === "trialing" ||
        ws.subscription_status === "trial"
      return isTrialing ? (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
          Trial
        </Badge>
      ) : (
        <span className="text-muted-foreground">Nao</span>
      )
    },
  },
  {
    id: "trial_ends_at",
    header: () => (
      <DataTableColumnHeader title="Expira em" />
    ),
    cell: ({ row }) => {
      const ws = row.original.primaryWorkspace
      if (!ws) return <span className="text-muted-foreground">-</span>
      const isTrialing =
        ws.subscription_status === "trialing" ||
        ws.subscription_status === "trial"
      if (!isTrialing || !ws.trial_ends_at)
        return <span className="text-muted-foreground">-</span>
      return (
        <span className="text-muted-foreground text-xs">
          {format(new Date(ws.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
      )
    },
  },
  {
    id: "workspace_quota",
    header: () => (
      <DataTableColumnHeader title="Cota" />
    ),
    cell: ({ row }) => {
      const user = row.original
      const ws = user.primaryWorkspace
      if (!ws) return <span className="text-muted-foreground">-</span>
      const quota =
        ws.member_limit ?? getPlanLimits(ws.plan || null, ws.subscription_status)
      return (
        <span className="text-muted-foreground text-xs">
          {user.primaryWorkspaceMemberCount}/{quota}
        </span>
      )
    },
  },
  {
    id: "plan",
    header: () => (
      <DataTableColumnHeader title="Plano" />
    ),
    cell: ({ row }) => {
      const user = row.original
      const accountPlan = user.account_plan
      const currentPlan = accountPlan || user.primaryWorkspace?.plan || null
      if (!currentPlan) {
        return <span className="text-muted-foreground text-xs">Sem workspace</span>
      }
      const displayName = getDisplayPlanName(
        user.primaryWorkspace?.plan || null,
        accountPlan
      )
      const planColors: Record<string, string> = {
        Pro: "bg-blue-100 text-blue-700 border-blue-200",
        Business: "bg-purple-100 text-purple-700 border-purple-200",
        Agency: "bg-emerald-100 text-emerald-700 border-emerald-200",
        Pessoal: "bg-gray-100 text-gray-700 border-gray-200",
      }
      return (
        <div>
          <Badge
            variant="outline"
            className={planColors[displayName] || planColors["Pessoal"]}
          >
            {displayName}
          </Badge>
          {user.primaryWorkspace?.name && (
            <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[120px]">
              {user.primaryWorkspace.name}
            </div>
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acoes</span>,
    cell: ({ row }) => {
      const user = row.original
      const accountPlan = user.account_plan
      const currentPlan = accountPlan || user.primaryWorkspace?.plan || null
      return (
        <div className="flex items-center justify-end gap-1">
          <AdminSupportLoginButton
            userId={user.id}
            userEmail={user.email}
          />
          <AdminUserPlanActions
            userId={user.id}
            currentPlan={currentPlan}
            accountPlan={accountPlan}
            hasWorkspace={Boolean(user.primaryWorkspace)}
          />
        </div>
      )
    },
  },
]
