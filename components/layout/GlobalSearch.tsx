"use client"

import * as React from "react"
import {
  Calendar,
  Settings,
  User,
  Search,
  CheckSquare,
  FileText,
  Building2
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useWorkspace } from "@/components/providers/SidebarProvider"
import { useWorkspaces } from "@/components/providers/WorkspacesProvider"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [taskResults, setTaskResults] = React.useState<Array<{ id: string; title: string }>>([])
  const [projectResults, setProjectResults] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { activeWorkspaceId } = useWorkspace()
  const workspaces = useWorkspaces()
  const supabase = React.useMemo(() => createBrowserClient(), [])

  const workspacePrefix = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length > 0 && segments[0] !== "home") {
      return `/${segments[0]}`
    }
    if (!activeWorkspaceId) return ""
    const workspace = (workspaces || []).find((ws) => ws.id === activeWorkspaceId)
    const slug = workspace?.slug || workspace?.id || activeWorkspaceId
    return slug ? `/${slug}` : ""
  }, [pathname, activeWorkspaceId, workspaces])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    const term = query.trim()
    if (!activeWorkspaceId || term.length < 2) {
      setTaskResults([])
      setProjectResults([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const [tasksResponse, projectsResponse] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, title")
            .eq("workspace_id", activeWorkspaceId)
            .neq("status", "archived")
            .ilike("title", `%${term}%`)
            .limit(6),
          supabase
            .from("project_icons")
            .select("tag_name")
            .eq("workspace_id", activeWorkspaceId)
            .ilike("tag_name", `%${term}%`)
            .limit(6),
        ])

        if (cancelled) return

        const tasks = (tasksResponse.data || [])
          .filter((task) => task?.title)
          .map((task) => ({ id: String(task.id), title: String(task.title) }))
        const projectIconTags = (projectsResponse.data || [])
          .map((row) => row?.tag_name)
          .filter((tag): tag is string => Boolean(tag))

        const tagsResponse = await supabase
          .from("tasks")
          .select("tags")
          .eq("workspace_id", activeWorkspaceId)
          .neq("status", "archived")
          .not("tags", "is", null)
          .limit(100)

        const tagMatches = new Set<string>()
        if (tagsResponse.data) {
          tagsResponse.data.forEach((row) => {
            if (row?.tags && Array.isArray(row.tags)) {
              row.tags.forEach((tag) => {
                if (tag && tag.toLowerCase().includes(term.toLowerCase())) {
                  tagMatches.add(tag)
                }
              })
            }
          })
        }

        const projects = Array.from(new Set([...projectIconTags, ...tagMatches])).slice(0, 6)

        setTaskResults(tasks)
        setProjectResults(projects)
      } catch {
        if (!cancelled) {
          setTaskResults([])
          setProjectResults([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, activeWorkspaceId, supabase])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    setQuery("")
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 bg-muted/50 border-muted-foreground/20 hover:bg-muted/80 shadow-none"
        onClick={() => setOpen(true)}
      >
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Digite um comando ou busque..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {isLoading && (
            <CommandGroup heading="Buscando">
              <CommandItem disabled value="loading">
                <Search className="mr-2 h-4 w-4" />
                <span>Carregando resultados...</span>
              </CommandItem>
            </CommandGroup>
          )}
          {!isLoading && query.trim().length > 0 && (
            <>
              {projectResults.length > 0 && (
                <CommandGroup heading="Projetos">
                  {projectResults.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            `${workspacePrefix}/tasks?tag=${encodeURIComponent(tag)}`
                          )
                        )
                      }
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>{tag}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {taskResults.length > 0 && (
                <CommandGroup heading="Tarefas">
                  {taskResults.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={task.title}
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            `${workspacePrefix}/tasks?search=${encodeURIComponent(task.title)}`
                          )
                        )
                      }
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <span>{task.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
          {query.trim().length > 0 && (
            <CommandGroup heading="Resultados">
              <CommandItem
                value={query.trim()}
                onSelect={() =>
                  runCommand(() =>
                    router.push(
                      `${workspacePrefix}/tasks?search=${encodeURIComponent(query.trim())}`
                    )
                  )
                }
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Buscar tarefas por "{query.trim()}"</span>
              </CommandItem>
            </CommandGroup>
          )}
          <CommandGroup heading="Sugestões">
            <CommandItem value="minha-semana" onSelect={() => runCommand(() => router.push(`${workspacePrefix}/home`))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Minha Semana</span>
            </CommandItem>
            <CommandItem value="tarefas" onSelect={() => runCommand(() => router.push(`${workspacePrefix}/tasks`))}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Tarefas</span>
            </CommandItem>
            <CommandItem value="financeiro" onSelect={() => runCommand(() => router.push(`${workspacePrefix}/finance`))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Financeiro</span>
            </CommandItem>
             <CommandItem value="configuracoes" onSelect={() => runCommand(() => router.push(`${workspacePrefix}/settings`))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </CommandItem>
            <CommandItem value="convidar-membro" onSelect={() => runCommand(() => router.push(`${workspacePrefix}/team`))}>
              <User className="mr-2 h-4 w-4" />
              <span>Convidar Membro</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}


