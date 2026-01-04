"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, useSidebar, useWorkspace } from "@/components/providers/SidebarProvider";
import { WorkspacesProvider } from "@/components/providers/WorkspacesProvider";
import { UIScaleProvider } from "@/components/providers/UIScaleProvider";
import { WorkspaceUrlSync } from "@/components/layout/WorkspaceUrlSync";
import { WorkspaceSyncAfterInvite } from "@/components/providers/WorkspaceSyncAfterInvite";
import { GlobalAssistantSheet } from "@/components/assistant/GlobalAssistantSheet";
import { WorkspaceLoadingOverlay } from "@/components/layout/WorkspaceLoadingOverlay";
import { WorkspaceSkeleton } from "@/components/skeletons/WorkspaceSkeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

import type { SubscriptionData } from "@/lib/types/subscription";

interface AppShellProps {
    children: React.ReactNode;
    user: any;
    workspaces: any[];
    initialSubscription?: SubscriptionData | null;
    initialProjectsTags?: string[];
    initialProjectsIcons?: Map<string, string>;
}

function LayoutContent({ children, user, workspaces, initialSubscription, initialProjectsTags, initialProjectsIcons }: AppShellProps) {
    const { isCollapsed } = useSidebar();
    const { isSwitchingWorkspace } = useWorkspace();
    const pathname = usePathname();
    const previousPathnameRef = useRef(pathname);
    const switchingStartTimeRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            const clickTs = sessionStorage.getItem("nav-click-ts");
            const clickHref = sessionStorage.getItem("nav-click-href");
            if (!clickTs) return;

            const delta = performance.now() - Number(clickTs);
            console.debug("[nav] latency", { pathname, clickHref, deltaMs: Math.round(delta) });
            sessionStorage.removeItem("nav-click-ts");
            sessionStorage.removeItem("nav-click-href");
        } catch { }
    }, [pathname]);

    // Detectar quando está trocando de workspace
    // Só iniciar timer se realmente começou a trocar agora
    useEffect(() => {
        if (isSwitchingWorkspace && !switchingStartTimeRef.current) {
            switchingStartTimeRef.current = Date.now();

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AppShell.tsx:55', message: 'Loading started - switchingStartTime set', data: { pathname, startTime: switchingStartTimeRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
            // #endregion
        } else if (!isSwitchingWorkspace) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AppShell.tsx:59', message: 'Loading stopped - resetting timer', data: { pathname, elapsed: switchingStartTimeRef.current ? Date.now() - switchingStartTimeRef.current : 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
            // #endregion

            // Resetar timer quando parar de trocar
            switchingStartTimeRef.current = null;
            // Resetar isPageReady também para evitar estados inconsistentes
        }
    }, [isSwitchingWorkspace, pathname]);

    // REMOVIDO: Proteção removida - o SidebarProvider agora controla exclusivamente o loading via Timestamp Lock

    // Reset pathname ref quando pathname muda
    useEffect(() => {
        if (pathname !== previousPathnameRef.current) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AppShell.tsx:81', message: 'Pathname changed', data: { oldPathname: previousPathnameRef.current, newPathname: pathname, isSwitchingWorkspace }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
            // #endregion

            previousPathnameRef.current = pathname;
        }
    }, [pathname, isSwitchingWorkspace]);

    // REMOVIDO: O controle de tempo agora é feito exclusivamente pelo SidebarProvider via Timestamp Lock Pattern
    // O AppShell não deve mais forçar setIsSwitchingWorkspace(false) baseado em isPageReady
    // Isso garante que os tempos de 3500ms (load inicial) e 2000ms (troca) sejam respeitados
    // 
    // O usePageReady ainda é usado para outras verificações, mas não controla mais o loading
    // O SidebarProvider é a única fonte de verdade para isSwitchingWorkspace

    return (
        <div className="min-h-screen bg-gray-50">
            <WorkspaceUrlSync workspaces={workspaces} />
            <WorkspaceSyncAfterInvite />

            {/* SKELETON SWAP: Renderiza Skeleton durante troca, children quando estável */}
            {isSwitchingWorkspace ? (
                <WorkspaceSkeleton isCollapsed={isCollapsed} />
            ) : (
                <>
                    <Sidebar
                        workspaces={workspaces}
                        initialSubscription={initialSubscription}
                        initialProjectsTags={initialProjectsTags}
                        initialProjectsIcons={initialProjectsIcons}
                    />
                    <div
                        className={cn(
                            "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                            isCollapsed ? "pl-[64px]" : "pl-[260px]"
                        )}
                    >
                        <Header user={user} />
                        <main className="flex-1 overflow-auto">
                            {children}
                        </main>
                    </div>
                </>
            )}

            {/* Global Assistant Sheet - FAB flutuante em todas as telas autenticadas */}
            <GlobalAssistantSheet user={user} workspaces={workspaces} />
            {/* Workspace Loading Overlay */}
            <WorkspaceLoadingOverlay isVisible={isSwitchingWorkspace} />
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
