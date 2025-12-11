"use client"

import * as React from "react"
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  CheckSquare,
  FileText,
  Building2
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

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

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64 bg-muted/50 border-muted-foreground/20 hover:bg-muted/80"
        onClick={() => setOpen(true)}
      >
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite um comando ou busque..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Sugestões">
            <CommandItem onSelect={() => runCommand(() => router.push('/home'))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Minha Semana</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/tasks'))}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Tarefas</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/finance'))}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Financeiro</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Recentes">
             <CommandItem onSelect={() => runCommand(() => console.log("Abrir Projeto Alpha"))}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>Projeto Alpha (Workspace)</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => console.log("Abrir Fatura #1234"))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Fatura #1234 (Financeiro)</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ações Rápidas">
            <CommandItem onSelect={() => runCommand(() => console.log("Nova Tarefa"))}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Nova Tarefa</span>
              <CommandShortcut>⌘T</CommandShortcut>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => console.log("Convidar Membro"))}>
              <User className="mr-2 h-4 w-4" />
              <span>Convidar Membro</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}


