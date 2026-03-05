"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useCallback, useRef, useTransition } from "react"

interface FilterOption {
  label: string
  value: string
}

interface DataTableToolbarProps {
  searchPlaceholder?: string
  filters?: Array<{
    key: string
    label: string
    options: FilterOption[]
  }>
  children?: React.ReactNode
}

function DataTableToolbar({
  searchPlaceholder = "Buscar...",
  filters = [],
  children,
}: DataTableToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSearch = searchParams.get("q") || ""
  const hasFilters =
    currentSearch ||
    filters.some((f) => searchParams.has(f.key))

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.set("page", "1")
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [searchParams, pathname, router]
  )

  const handleSearch = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        updateParams("q", value || null)
      }, 300)
    },
    [updateParams]
  )

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname)
    })
  }, [pathname, router])

  return (
    <div className="flex items-center justify-between gap-2 py-4">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            defaultValue={currentSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={searchParams.get(filter.key) || "all"}
            onValueChange={(value) =>
              updateParams(filter.key, value === "all" ? null : value)
            }
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2"
          >
            Limpar
            <X className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {children}
    </div>
  )
}

export { DataTableToolbar }
