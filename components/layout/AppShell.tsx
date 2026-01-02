"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, useSidebar } from "@/components/providers/SidebarProvider";
import { WorkspacesProvider } from "@/components/providers/WorkspacesProvider";
import { UIScaleProvider } from "@/components/providers/UIScaleProvider";
import { WorkspaceUrlSync } from "@/components/layout/WorkspaceUrlSync";
import { WorkspaceSyncAfterInvite } from "@/components/providers/WorkspaceSyncAfterInvite";
import { GlobalAssistantSheet } from "@/components/assistant/GlobalAssistantSheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

import type { SubscriptionData } from "@/lib/types/subscription";

interface AppShellProps {
    children: React.ReactNode;
    user: any;
    workspaces: any[];
    initialSubscription?: SubscriptionData | null;
}

function LayoutContent({ children, user, workspaces, initialSubscription }: AppShellProps) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();

    useEffect(() => {
        try {
            const clickTs = sessionStorage.getItem("nav-click-ts");
            const clickHref = sessionStorage.getItem("nav-click-href");
            if (!clickTs) return;

            const delta = performance.now() - Number(clickTs);
            console.debug("[nav] latency", { pathname, clickHref, deltaMs: Math.round(delta) });
            sessionStorage.removeItem("nav-click-ts");
            sessionStorage.removeItem("nav-click-href");
        } catch {}
    }, [pathname]);

    return (
        <div className="min-h-screen bg-gray-50">
            <WorkspaceUrlSync workspaces={workspaces} />
            <WorkspaceSyncAfterInvite />
            <Sidebar workspaces={workspaces} initialSubscription={initialSubscription} />
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
            {/* Global Assistant Sheet - FAB flutuante em todas as telas autenticadas */}
            <GlobalAssistantSheet user={user} workspaces={workspaces} />
        </div>
    );
}

export function AppShell(props: AppShellProps) {
    return (
        <SidebarProvider>
            <WorkspacesProvider workspaces={props.workspaces}>
                <UIScaleProvider>
                    <TooltipProvider delayDuration={0}>
                        <LayoutContent {...props} />
                    </TooltipProvider>
                </UIScaleProvider>
            </WorkspacesProvider>
        </SidebarProvider>
    );
}
