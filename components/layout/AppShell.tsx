"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, useSidebar, useWorkspace, useWorkspaceLoading } from "@/components/providers/SidebarProvider";
import { WorkspacesProvider, useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { UIScaleProvider } from "@/components/providers/UIScaleProvider";
import { WorkspaceUrlSync } from "@/components/layout/WorkspaceUrlSync";
import { WorkspaceSyncAfterInvite } from "@/components/providers/WorkspaceSyncAfterInvite";
import { GlobalAssistantSheet } from "@/components/assistant/GlobalAssistantSheet";
import { WorkspaceLoadingOverlay } from "@/components/layout/WorkspaceLoadingOverlay";
import { WorkspaceSkeleton } from "@/components/skeletons/WorkspaceSkeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SupportSessionBanner } from "@/components/layout/SupportSessionBanner";
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
    initialWorkspaceId?: string;
}

function LayoutContent({ children, user, initialSubscription, initialProjectsTags, initialProjectsIcons, initialWorkspaceId }: AppShellProps) {
    const { isCollapsed } = useSidebar();
    const { isSwitchingWorkspace, isInitialLoad } = useWorkspaceLoading();
    const pathname = usePathname();
    const workspaces = useWorkspaces();
    const previousPathnameRef = useRef(pathname);

    // Reset pathname ref quando pathname muda
    useEffect(() => {
        if (pathname !== previousPathnameRef.current) {
            previousPathnameRef.current = pathname;
        }
    }, [pathname]);
    useEffect(() => {
        if (pathname !== previousPathnameRef.current) {
            previousPathnameRef.current = pathname;
        }
    }, [pathname]);

    return (
        <div className="min-h-screen bg-gray-50">
            <WorkspaceUrlSync workspaces={workspaces} />
            <WorkspaceSyncAfterInvite />

            <Sidebar
                workspaces={workspaces}
                initialSubscription={initialSubscription}
                initialProjectsTags={initialProjectsTags}
                initialProjectsIcons={initialProjectsIcons}
                initialWorkspaceId={initialWorkspaceId}
            />
            <div
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    isCollapsed ? "pl-[64px]" : "pl-[260px]"
                )}
            >
                <SupportSessionBanner />
                <Header user={user} />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>

            {/* Global Assistant Sheet - FAB flutuante em todas as telas autenticadas */}
            <GlobalAssistantSheet user={user} workspaces={workspaces} />

            {/* Workspace Loading Overlay appears ON TOP, without unmounting content */}
            <WorkspaceLoadingOverlay isVisible={isSwitchingWorkspace} isInitialLoad={isInitialLoad} />
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
