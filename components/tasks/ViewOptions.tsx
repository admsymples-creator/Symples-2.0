"use client"

import * as React from "react"
import { LayoutGrid, Check, X } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function GroupingMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Ler estado da URL (Source of Truth)
  const currentGroup = searchParams.get("group") || "group"

  // 2. Mapeamento de Labels para exibição no Badge
  const groupLabels: Record<string, string> = {
    group: "Personalizado",
    project: "Projeto",
    status: "Status",
    date: "Data",
    assignee: "Responsável"
  }

  // 3. Handler Instantâneo (Reactive Pattern)
  const handleGroupChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    params.set("group", value)

    // scroll: false é CRÍTICO para evitar que a página pule para o topo ao clicar
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // 4. Handler para limpar filtro (resetar para "none")
  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("group", "group")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const isGrouped = currentGroup !== "group"

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title={groupLabels[currentGroup] ? `Agrupar (${groupLabels[currentGroup]})` : "Agrupar"}
            className={cn(
              "h-9 w-9 transition-all flex items-center justify-center",
              isGrouped
                ? "text-green-700 hover:text-green-800 hover:bg-green-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <LayoutGrid className={cn("h-4 w-4", isGrouped ? "text-green-600" : "text-gray-500")} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-48" align="start">
          <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            AGRUPAR POR
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuRadioGroup value={currentGroup} onValueChange={handleGroupChange}>
            <DropdownMenuRadioItem value="group" className="cursor-pointer">
              Personalizado
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="project" className="cursor-pointer">
              Projeto
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="status" className="cursor-pointer">
              Status
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="date" className="cursor-pointer">
              Data
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="assignee" className="cursor-pointer">
              Responsável
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {isGrouped && (
        <div className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
          <span>{groupLabels[currentGroup] || "Status"}</span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 rounded-full p-0.5 text-green-600 hover:text-green-800 hover:bg-green-100"
            title="Limpar agrupamento"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
