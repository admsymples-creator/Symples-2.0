"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/admin/data-table/DataTableColumnHeader"
import { WorkspaceActions } from "@/components/admin/WorkspaceActions"
import { getPlanLimits } from "@/lib/utils/subscription-helpers"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { AdminWorkspaceRow } from "@/types/admin"
import Link from "next/link"

function getPlanBadge(plan: string | null) {
  switch (plan) {
    case "pro":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200" variant="outline">
          Pro
        </Badge>
      )
    case "business":
      return (
        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200" variant="outline">
          Business
        </Badge>
      )
    case "agency":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200" variant="outline">
          Agency
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
          Pessoal
        </Badge>
      )
  }
}

export const workspacesColumns: ColumnDef<AdminWorkspaceRow>[] = [
  {
    accessorKey: "name",
    header: () => (
      <DataTableColumnHeader title="Workspace" sortKey="name" />
    ),
    cell: ({ row }) => {
      const ws = row.original
      return (
        <div className="min-w-0">
          <Link
            href={`/admin/workspaces/${ws.id}`}
            className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors"
          >
            {ws.name}
          </Link>
          <div className="text-xs text-muted-foreground font-mono truncate">
            {ws.slug}
          </div>
        </div>
      )
    },
  },
  {
    id: "owner",
    header: () => (
      <DataTableColumnHeader title="Dono" />
    ),
    cell: ({ row }) => {
      const owner = row.original.owner
      if (!owner) return <span className="text-muted-foreground">-</span>
      return (
        <div className="text-xs min-w-0">
          <div className="font-medium text-gray-700 truncate">
            {owner.full_name}
          </div>
          <div className="text-muted-foreground truncate">{owner.email}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "plan",
    header: () => (
      <DataTableColumnHeader title="Plano" sortKey="plan" />
    ),
    cell: ({ row }) => {
      const ws = row.original
      return (
        <div className="flex items-center gap-2">
          {getPlanBadge(ws.plan)}
          {ws.subscription_status === "trialing" && (
            <span className="text-xs text-orange-600 font-medium">TRIAL</span>
          )}
        </div>
      )
    },
  },
  {
    id: "members",
    header: () => (
      <DataTableColumnHeader title="Membros" />
    ),
    cell: ({ row }) => {
      const ws = row.original
      const memberCount = ws.members?.[0]?.count || 0
      const limit =
        ws.member_limit ??
        getPlanLimits(ws.plan || null, ws.subscription_status || null)
      return (
        <span className="text-muted-foreground text-xs">
          {memberCount}/{limit}
        </span>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: () => (
      <DataTableColumnHeader
        title="Criado em"
        sortKey="created_at"
      />
    ),
    cell: ({ row }) => {
      const date = row.original.created_at
      return (
        <span className="text-muted-foreground text-xs">
          {date
            ? format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
            : "-"}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acoes</span>,
    cell: ({ row }) => {
      const ws = row.original
      return (
        <div className="flex justify-end">
          <WorkspaceActions
            workspaceId={ws.id}
            currentPlan={ws.plan || "starter"}
          />
        </div>
      )
    },
  },
]
