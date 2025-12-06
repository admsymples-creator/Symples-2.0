"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, useSidebar } from "@/components/providers/SidebarProvider";
import { WorkspaceUrlSync } from "@/components/layout/WorkspaceUrlSync";
import { WorkspaceSyncAfterInvite } from "@/components/providers/WorkspaceSyncAfterInvite";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AppShellProps {
    children: React.ReactNode;
    user: any;
    workspaces: any[];
}

function LayoutContent({ children, user, workspaces }: AppShellProps) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-gray-50">
            <WorkspaceUrlSync workspaces={workspaces} />
            <WorkspaceSyncAfterInvite />
            <Sidebar workspaces={workspaces} />
            <div 
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                     isCollapsed ? "pl-[80px]" : "pl-[260px]"
                )}
            >
                <Header user={user} />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

export function AppShell(props: AppShellProps) {
    return (
        <SidebarProvider>
            <TooltipProvider delayDuration={0}>
                <LayoutContent {...props} />
            </TooltipProvider>
        </SidebarProvider>
    );
}

