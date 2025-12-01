"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type AppContextType = {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // Sidebar State
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Workspace State
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Restore Sidebar State
        const savedSidebar = localStorage.getItem("sidebar-state");
        if (savedSidebar) {
            setIsCollapsed(savedSidebar === "true");
        }

        // Restore Workspace State
        const savedWorkspace = localStorage.getItem("active-workspace-id");
        if (savedWorkspace) {
            setActiveWorkspaceId(savedWorkspace);
        }

        setIsMounted(true);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-state", String(newState));
    };

    const handleSetWorkspace = (id: string) => {
        setActiveWorkspaceId(id);
        localStorage.setItem("active-workspace-id", id);
    };
    
    return (
        <AppContext.Provider value={{ 
            isCollapsed, 
            toggleSidebar, 
            activeWorkspaceId, 
            setActiveWorkspaceId: handleSetWorkspace 
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}

export function useWorkspace() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useWorkspace must be used within a SidebarProvider");
    }
    return {
        activeWorkspaceId: context.activeWorkspaceId,
        setActiveWorkspaceId: context.setActiveWorkspaceId
    };
}
