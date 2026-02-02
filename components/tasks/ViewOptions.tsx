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

interface GroupingMenuProps {
  /** Valor controlado pelo pai: UI atualiza na hora, URL em segundo plano */
  value?: string
  onGroupChange?: (value: string) => void
}

export function GroupingMenu({ value: controlledValue, onGroupChange }: GroupingMenuProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Estado: controlado pelo pai (value/onGroupChange) ou pela URL
  const currentGroup = controlledValue ?? searchParams.get("group") ?? "group"

  const groupLabels: Record<string, string> = {
    group: "Personalizado",
    project: "Projeto",
    status: "Status",
    date: "Data",
    assignee: "Responsável"
  }

  const handleGroupChange = (value: string) => {
    if (onGroupChange) {
      onGroupChange(value)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set("group", value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleClear = () => {
    if (onGroupChange) {
      onGroupChange("group")
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set("group", "group")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const isGrouped = currentGroup !== "group"

  return (
    <div className="flex items-center gap-1">
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
    </div>
  )
}
