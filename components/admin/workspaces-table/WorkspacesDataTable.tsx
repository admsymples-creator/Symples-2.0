"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table/DataTable"
import { DataTableToolbar } from "@/components/admin/data-table/DataTableToolbar"
import { workspacesColumns } from "./columns"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { exportAdminWorkspaces } from "@/lib/actions/admin"
import { exportToCSV } from "@/lib/utils/export-csv"
import type { AdminWorkspaceRow, PaginatedResult } from "@/types/admin"

const planFilterOptions = [
  { label: "Pessoal", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Business", value: "business" },
  { label: "Agency", value: "agency" },
]

interface WorkspacesDataTableProps {
  result: PaginatedResult<AdminWorkspaceRow>
}

function WorkspacesDataTable({ result }: WorkspacesDataTableProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportAdminWorkspaces()
      exportToCSV(data as Record<string, unknown>[], "workspaces", [
        { key: "name", header: "Nome" },
        { key: "slug", header: "Slug" },
        { key: "plan", header: "Plano" },
        { key: "subscription_status", header: "Status" },
        { key: "member_limit", header: "Limite Membros" },
        { key: "created_at", header: "Criado em" },
      ])
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <DataTableToolbar
        searchPlaceholder="Nome da empresa..."
        filters={[
          { key: "plan", label: "Plano", options: planFilterOptions },
        ]}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1 h-4 w-4" />
          )}
          CSV
        </Button>
      </DataTableToolbar>
      <DataTable
        columns={workspacesColumns}
        data={result.data}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        emptyMessage="Nenhum workspace encontrado."
      />
    </div>
  )
}

export { WorkspacesDataTable }
