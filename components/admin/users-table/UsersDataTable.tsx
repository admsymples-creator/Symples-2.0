"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/data-table/DataTable"
import { DataTableToolbar } from "@/components/admin/data-table/DataTableToolbar"
import { usersColumns } from "./columns"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { exportAdminUsers } from "@/lib/actions/admin"
import { exportToCSV } from "@/lib/utils/export-csv"
import type { AdminUserRow, PaginatedResult } from "@/types/admin"

const planFilterOptions = [
  { label: "Pessoal", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Business", value: "business" },
  { label: "Agency", value: "agency" },
]

const trialFilterOptions = [
  { label: "Em trial", value: "trialing" },
  { label: "Ativo", value: "active" },
  { label: "Cancelado", value: "canceled" },
]

interface UsersDataTableProps {
  result: PaginatedResult<AdminUserRow>
}

function UsersDataTable({ result }: UsersDataTableProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportAdminUsers()
      exportToCSV(data as Record<string, unknown>[], "usuarios", [
        { key: "full_name", header: "Nome" },
        { key: "email", header: "Email" },
        { key: "whatsapp", header: "WhatsApp" },
        { key: "created_at", header: "Data Cadastro" },
        { key: "account_plan", header: "Plano" },
      ])
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <DataTableToolbar
        searchPlaceholder="Nome ou email..."
        filters={[
          { key: "plan", label: "Plano", options: planFilterOptions },
          { key: "status", label: "Status", options: trialFilterOptions },
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
        columns={usersColumns}
        data={result.data}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        emptyMessage="Nenhum usuario encontrado."
      />
    </div>
  )
}

export { UsersDataTable }
