"use client"

import { DataTable } from "@/components/admin/data-table/DataTable"
import { DataTableToolbar } from "@/components/admin/data-table/DataTableToolbar"
import { auditLogsColumns } from "./columns"
import type { AdminAuditLogRow, PaginatedResult } from "@/types/admin"

const actionFilterOptions = [
  { label: "Support Login", value: "support_login" },
  { label: "Trial Invite", value: "trial_invite" },
  { label: "Plan Change", value: "plan_change" },
]

interface AuditLogsDataTableProps {
  result: PaginatedResult<AdminAuditLogRow>
}

function AuditLogsDataTable({ result }: AuditLogsDataTableProps) {
  return (
    <div>
      <DataTableToolbar
        searchPlaceholder="Buscar por acao..."
        filters={[
          { key: "q", label: "Tipo", options: actionFilterOptions },
        ]}
      />
      <DataTable
        columns={auditLogsColumns}
        data={result.data}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        emptyMessage="Nenhum log encontrado."
      />
    </div>
  )
}

export { AuditLogsDataTable }
