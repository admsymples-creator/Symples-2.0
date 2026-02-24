"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Search,
} from "lucide-react"

const navigationItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Workspaces", href: "/admin/workspaces", icon: Building2 },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList },
]

function AdminCommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar paginas, acoes..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Navegacao">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => runCommand(() => router.push(item.href))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Acoes Rapidas">
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/admin/users?q="))
            }
          >
            <Search className="mr-2 h-4 w-4" />
            Buscar usuario...
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/admin/workspaces?q="))
            }
          >
            <Search className="mr-2 h-4 w-4" />
            Buscar workspace...
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export { AdminCommandPalette }
