"use client";

import React, { startTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getDisplayPlanName } from "@/lib/utils/subscription-helpers";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspace, useWorkspaceLoading } from "@/components/providers/SidebarProvider";
import type { SubscriptionData } from "@/lib/types/subscription";

interface Workspace {
    id: string;
    name: string;
    slug: string | null;
    logo_url?: string | null;
}

interface SidebarWorkspaceSwitcherProps {
    isCollapsed: boolean;
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    currentWorkspace?: Workspace;
    initialSubscription?: Pick<SubscriptionData, 'id' | 'plan' | 'account_plan' | 'subscription_status' | 'trial_ends_at'> | null;
}

export function SidebarWorkspaceSwitcher({
    isCollapsed,
    workspaces,
    activeWorkspaceId,
    currentWorkspace,
    initialSubscription
}: SidebarWorkspaceSwitcherProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { setActiveWorkspaceId } = useWorkspace();
    const { isSwitchingWorkspace } = useWorkspaceLoading();

    const hasWorkspaces = workspaces.length > 0;

    // Calcular dias restantes do trial (memoizado)
    const trialDaysRemaining = useMemo(() => {
        if (!initialSubscription?.trial_ends_at) return null;
        const trialEndsAt = new Date(initialSubscription.trial_ends_at);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining > 0 ? daysRemaining : 0;
    }, [initialSubscription?.trial_ends_at]);

    const isTrialing =
        (initialSubscription?.subscription_status === 'trialing' ||
            initialSubscription?.subscription_status === 'trial') &&
        !initialSubscription?.account_plan;

    return (
        <div className={cn(
            "h-16 flex items-center border-b border-gray-200 transition-all duration-300 relative",
            isCollapsed ? "justify-center px-0" : "px-4"
        )}>
            {/* Workspace Switcher */}
            {hasWorkspaces ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "gap-3 hover:bg-gray-100/80 transition-all group p-0 rounded-lg flex-1",
                                isCollapsed ? "justify-center px-2 h-10 w-10" : "justify-start px-3 h-12"
                            )}
                        >
                            <div className={cn(
                                "rounded-md bg-[#050815] flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:shadow transition-shadow overflow-hidden",
                                isCollapsed ? "w-8 h-8" : "w-8 h-8"
                            )}>
                                {currentWorkspace?.logo_url ? (
                                    <img
                                        src={currentWorkspace.logo_url}
                                        alt={currentWorkspace.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Building2 className={cn(isCollapsed ? "w-4 h-4" : "w-4 h-4")} />
                                )}
                            </div>

                            {!isCollapsed && (
                                <>
                                    <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                        <div className="flex items-center gap-2 w-full min-w-0">
                                            <span className="font-semibold text-sm text-gray-900 truncate min-w-0 flex-1">
                                                {currentWorkspace?.name || "Selecione"}
                                            </span>
                                            {isTrialing && trialDaysRemaining !== null && (
                                                <Link
                                                    href="/billing"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-shrink-0"
                                                >
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] px-1.5 h-4 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 cursor-pointer transition-colors"
                                                    >
                                                        {trialDaysRemaining > 0
                                                            ? `${trialDaysRemaining} ${trialDaysRemaining === 1 ? "dia" : "dias"}`
                                                            : "Expirado"}
                                                    </Badge>
                                                </Link>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500 truncate group-hover:text-gray-700 transition-colors w-full">
                                            {isTrialing
                                                ? "Plano Trial"
                                                : initialSubscription?.plan || initialSubscription?.account_plan
                                                    ? `Plano ${getDisplayPlanName(initialSubscription.plan, initialSubscription.account_plan)}`
                                                    : "Workspace"}
                                        </span>
                                    </div>

                                    <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-auto opacity-50 group-hover:opacity-100" />
                                </>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[220px]" align="start" side={isCollapsed ? "right" : "bottom"}>
                        <DropdownMenuLabel className="text-xs text-gray-500 font-medium px-2 py-1.5">
                            Trocar Workspace
                        </DropdownMenuLabel>
                        {workspaces.map((workspace) => (
                            <DropdownMenuItem
                                key={workspace.id}
                                onMouseEnter={() => {
                                    // Prefetch route and subscription on hover for faster navigation
                                    const base = workspace.slug || workspace.id;
                                    if (base) {
                                        router.prefetch(`/${base}/home`);
                                        // Prefetch subscription data
                                        fetch(`/api/workspace/subscription?workspaceId=${workspace.id}`).catch(() => { });
                                    }
                                }}
                                onClick={() => {
                                    if (workspace.id === activeWorkspaceId) return;

                                    // CRÍTICO: setActiveWorkspaceId ativa o loading ANTES de navegar
                                    // Isso garante que o loading apareça imediatamente
                                    setActiveWorkspaceId(workspace.id);

                                    const base = workspace.slug || workspace.id;
                                    if (base) {
                                        // Usar setTimeout para garantir que o loading apareça antes da navegação
                                        // 80ms (~5 frames) garante que o browser pinte o spinner antes de travar a thread na navegação
                                        setTimeout(() => {
                                            startTransition(() => {
                                                router.push(`/${base}/home`);
                                            });
                                        }, 80);
                                    }
                                }}
                                className={cn(
                                    "gap-2 cursor-pointer min-w-0",
                                    isSwitchingWorkspace && workspace.id !== activeWorkspaceId && "opacity-50"
                                )}
                                disabled={isSwitchingWorkspace}
                            >
                                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {workspace.logo_url ? (
                                        <img
                                            src={workspace.logo_url}
                                            alt={workspace.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className="w-3 h-3 text-gray-500" />
                                    )}
                                </div>
                                <span className="flex-1 truncate min-w-0">{workspace.name}</span>
                                {workspace.id === activeWorkspaceId && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#050815] flex-shrink-0" />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer gap-2 text-[#050815] focus:text-[#050815] focus:bg-gray-50">
                            <Link href="/onboarding" prefetch={false}>
                                <Plus className="w-4 h-4" />
                                Criar Novo Workspace
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Link
                    href="/onboarding"
                    prefetch={false}
                    className={cn(
                        "flex items-center justify-center gap-2 w-full h-10 text-sm border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-[#050815] hover:border-[#050815] hover:bg-gray-50 transition-all",
                        isCollapsed ? "px-0" : ""
                    )}
                >
                    <Plus className="w-4 h-4" />
                    {!isCollapsed && "Criar Workspace"}
                </Link>
            )}
        </div>
    );
}
