"use client"

import * as React from "react"
import { LayoutGrid, Check, X } from "lucide-react" // Ícone mais adequado para "Agrupar"
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function GroupingMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Ler estado da URL (Source of Truth)
  const currentGroup = searchParams.get("group") || "none"

  // 2. Mapeamento de Labels para exibição no Badge
  const groupLabels: Record<string, string> = {
    none: "Nenhum",
    status: "Status",
    date: "Data",
    assignee: "Responsável"
  }

  // 3. Handler Instantâneo (Reactive Pattern)
  const handleGroupChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value === "none") {
      params.delete("group")
    } else {
      params.set("group", value)
    }

    // scroll: false é CRÍTICO para evitar que a página pule para o topo ao clicar
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // 4. Handler para limpar filtro (resetar para "none")
  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("group")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const isGrouped = currentGroup !== "none"

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-9 px-3 border-dashed transition-all",
              isGrouped 
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            )}
          >
            <LayoutGrid className={cn("mr-2 h-4 w-4", isGrouped ? "text-green-600" : "text-gray-500")} />
            Agrupar
            {isGrouped && (
              <>
                <div className="mx-2 h-4 w-[1px] bg-green-200" />
                <Badge 
                  variant="secondary" 
                  className="h-5 px-1.5 text-[10px] font-medium bg-white text-green-700 hover:bg-white"
                >
                  {groupLabels[currentGroup] || "Status"}
                </Badge>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-48" align="start">
          <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            AGRUPAR POR
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuRadioGroup value={currentGroup} onValueChange={handleGroupChange}>
            <DropdownMenuRadioItem value="none" className="cursor-pointer">
              Nenhum (Lista)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="status" className="cursor-pointer">
              Status
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="assignee" className="cursor-pointer">
              Responsável
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {isGrouped && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          title="Limpar filtro de agrupamento"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}