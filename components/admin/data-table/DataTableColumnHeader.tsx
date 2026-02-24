"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

interface DataTableColumnHeaderProps {
  title: string
  sortKey?: string
}

function DataTableColumnHeader({
  title,
  sortKey,
}: DataTableColumnHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get("sort")
  const currentOrder = searchParams.get("order") || "desc"

  const isSorted = sortKey && currentSort === sortKey
  const isAsc = isSorted && currentOrder === "asc"

  const handleSort = useCallback(() => {
    if (!sortKey) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", "1")

    if (isSorted && currentOrder === "asc") {
      params.delete("sort")
      params.delete("order")
    } else if (isSorted) {
      params.set("sort", sortKey)
      params.set("order", "asc")
    } else {
      params.set("sort", sortKey)
      params.set("order", "desc")
    }

    router.push(`${pathname}?${params.toString()}`)
  }, [sortKey, isSorted, currentOrder, searchParams, pathname, router])

  if (!sortKey) {
    return <div className="text-xs font-medium">{title}</div>
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium"
      onClick={handleSort}
    >
      {title}
      {isSorted ? (
        isAsc ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ChevronsUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />
      )}
    </Button>
  )
}

export { DataTableColumnHeader }
