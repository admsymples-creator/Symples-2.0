"use client"

import { useAdminSidebar } from "./AdminSidebarContext"
import { cn } from "@/lib/utils"

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useAdminSidebar()

    return (
        <main
            className={cn(
                "min-h-screen transition-all duration-200",
                isCollapsed ? "pl-16" : "pl-64"
            )}
        >
            <div className="h-16 border-b border-gray-200 bg-white px-8 flex items-center justify-between sticky top-0 z-40">
                <h1 className="font-semibold text-gray-700">Visao Geral do Sistema</h1>
                <div className="flex items-center gap-4">
                    <kbd className="pointer-events-none text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                        Ctrl+K
                    </kbd>
                    <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                        SA
                    </div>
                </div>
            </div>
            <div className="p-8 max-w-[1600px] mx-auto">
                {children}
            </div>
        </main>
    )
}

export { AdminLayoutContent }
