"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface AdminSidebarContextValue {
  isCollapsed: boolean
  toggle: () => void
}

const AdminSidebarContext = createContext<AdminSidebarContextValue>({
  isCollapsed: false,
  toggle: () => {},
})

function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const toggle = useCallback(() => setIsCollapsed((prev) => !prev), [])

  return (
    <AdminSidebarContext.Provider value={{ isCollapsed, toggle }}>
      {children}
    </AdminSidebarContext.Provider>
  )
}

function useAdminSidebar() {
  return useContext(AdminSidebarContext)
}

export { AdminSidebarProvider, useAdminSidebar }
