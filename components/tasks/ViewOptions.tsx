"use client"

import * as React from "react"
import { LayoutGrid, Check } from "lucide-react" // Ícone mais adequado para "Agrupar"
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
    priority: "Prioridade",
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

  const isGrouped = currentGroup !== "none"

  return (
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
                {groupLabels[currentGroup]}
              </Badge>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-48" align="start">
        <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Visualização
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuRadioGroup value={currentGroup} onValueChange={handleGroupChange}>
          <DropdownMenuRadioItem value="none" className="cursor-pointer">
            Nenhum (Lista)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="status" className="cursor-pointer">
            Status
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="priority" className="cursor-pointer">
            Prioridade
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="assignee" className="cursor-pointer">
            Responsável
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}