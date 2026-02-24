"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Loader2 } from "lucide-react"
import { useState } from "react"
import { bulkUpdateWorkspacePlan } from "@/lib/actions/admin"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DataTableBulkActionsProps {
  selectedCount: number
  selectedIds: string[]
  onClear: () => void
  type: "users" | "workspaces"
}

function DataTableBulkActions({
  selectedCount,
  selectedIds,
  onClear,
  type,
}: DataTableBulkActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (selectedCount === 0) return null

  const handleBulkPlan = async (plan: string) => {
    if (type !== "workspaces") return
    setIsLoading(true)
    try {
      await bulkUpdateWorkspacePlan(
        selectedIds,
        plan as "starter" | "pro" | "business" | "agency"
      )
      toast.success(`Plano atualizado para ${selectedCount} workspace(s)`)
      onClear()
      router.refresh()
    } catch {
      toast.error("Erro ao atualizar planos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg">
      <span className="text-sm font-medium">
        {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
      </span>

      {type === "workspaces" && (
        <Select
          onValueChange={handleBulkPlan}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 w-[140px] bg-slate-800 border-slate-700 text-white text-xs">
            <SelectValue placeholder="Alterar plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="starter">Pessoal</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
          </SelectContent>
        </Select>
      )}

      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export { DataTableBulkActions }
