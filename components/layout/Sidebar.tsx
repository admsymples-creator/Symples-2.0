"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Home, CheckSquare, DollarSign, Settings, Building2, Sparkles, Plus, ChevronsUpDown, ChevronsLeft, ChevronsRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSidebar, useWorkspace } from "@/components/providers/SidebarProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const personalItems: NavItem[] = [
    { label: "Minha Semana", href: "/home", icon: Home },
    // Assistente IA agora acessível via FAB (GlobalAssistantSheet)
    // { label: "Assistente IA", href: "/assistant", icon: Sparkles },
];

const workspaceItems: NavItem[] = [
    { label: "Tarefas", href: "/tasks", icon: CheckSquare },
    { label: "Financeiro", href: "/finance", icon: DollarSign },
];

interface SidebarProps {
    workspaces?: { id: string; name: string; slug: string | null; logo_url?: string | null }[];
}

const NavItemView = React.memo(({ item, isActive, isCollapsed }: { item: NavItem, isActive: boolean, isCollapsed: boolean }) => {
    const Icon = item.icon;

    const content = (
        <Link
            href={item.href}
            className={cn(
                "flex items-center gap-3 rounded-lg transition-colors relative group whitespace-nowrap",
                isCollapsed ? "justify-center p-2 h-10 w-10 mx-auto" : "px-3 py-2 text-sm w-full",
                isActive
                    ? "bg-green-50 text-green-700 font-semibold"
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
            )}
        >
            <Icon className={cn(
                "flex-shrink-0",
                isCollapsed ? "w-5 h-5" : "w-5 h-5",
                isActive ? "text-green-700" : "text-gray-500"
            )} />
            <span className={cn(
                "transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
                {item.label}
            </span>
        </Link>
    );

    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent side="right">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return content;
}, (prevProps, nextProps) => {
    // Only re-render if these props actually change
    return prevProps.isActive === nextProps.isActive &&
        prevProps.isCollapsed === nextProps.isCollapsed &&
        prevProps.item.href === nextProps.item.href;
});
NavItemView.displayName = 'NavItemView';

interface WorkspaceSubscription {
    id: string;
    plan: 'starter' | 'pro' | 'business' | null;
    subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
    trial_ends_at: string | null;
}

function SidebarContent({ workspaces = [] }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
    const [subscriptionData, setSubscriptionData] = useState<WorkspaceSubscription | null>(null);

    // Buscar dados de subscription do workspace ativo
    useEffect(() => {
        if (!activeWorkspaceId) {
            setSubscriptionData(null);
            return;
        }

        const fetchSubscription = async () => {
            try {
                const response = await fetch(`/api/workspace/subscription?workspaceId=${activeWorkspaceId}`);
                if (response.ok) {
                    const data = await response.json();
                    setSubscriptionData(data);
                }
            } catch (error) {
                console.error("Erro ao buscar dados de subscription:", error);
                setSubscriptionData(null);
            }
        };

        fetchSubscription();
    }, [activeWorkspaceId]);

    // Calcular dias restantes do trial
    const getTrialDaysRemaining = () => {
        if (!subscriptionData?.trial_ends_at) return null;
        const trialEndsAt = new Date(subscriptionData.trial_ends_at);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining > 0 ? daysRemaining : 0;
    };

    const isTrialing = subscriptionData?.subscription_status === 'trialing';
    const trialDaysRemaining = isTrialing ? getTrialDaysRemaining() : null;

    const isActive = (href: string) => {
        if (href.includes('?')) {
            const [path, query] = href.split('?');
            const params = new URLSearchParams(query);
            const targetTab = params.get('tab');
            const currentTab = searchParams.get('tab');

            return pathname === path && currentTab === targetTab;
        }

        if (href === "/settings") {
            return pathname === "/settings" && (!searchParams.get('tab') || searchParams.get('tab') === 'general');
        }

        if (href === "/home") {
            return pathname === "/home";
        }
        return pathname?.startsWith(href);
    };

    const hasWorkspaces = React.useMemo(() => workspaces.length > 0, [workspaces.length]);

    // Set initial workspace if not set
    React.useEffect(() => {
        if (hasWorkspaces && !activeWorkspaceId) {
            setActiveWorkspaceId(workspaces[0].id);
        } else if (hasWorkspaces && activeWorkspaceId && !workspaces.find(w => w.id === activeWorkspaceId)) {
            // If active workspace is not in the list (e.g. user lost access), switch to first
            setActiveWorkspaceId(workspaces[0].id);
        }
    }, [workspaces, hasWorkspaces, activeWorkspaceId, setActiveWorkspaceId]);

    const { currentWorkspace, workspacePrefix } = React.useMemo(() => {
        const workspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
        const base = workspace?.slug || workspace?.id || "";
        return {
            currentWorkspace: workspace,
            workspacePrefix: base ? `/${base}` : ""
        };
    }, [workspaces, activeWorkspaceId]);

    return (
        <aside
            className={cn(
                "bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[80px]" : "w-[260px]"
            )}
        >
            {/* Logo & Toggle Button */}
            <div className={cn(
                "h-16 flex items-center border-b border-gray-200 transition-all duration-300 relative",
                isCollapsed ? "justify-center px-0" : "px-4 justify-between"
            )}>
                <Link href="/home" className={cn("block", isCollapsed ? "mx-auto" : "")}>
                    {isCollapsed ? (
                        <Image
                            src="/logo-dock.png"
                            alt="Symples"
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                        />
                    ) : (
                        <Image
                            src="/logo-black.svg"
                            alt="Symples"
                            width={120}
                            height={36}
                            priority
                            className="h-8 w-auto"
                        />
                    )}
                </Link>

                {/* Toggle Button - Top Right */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className={cn(
                        "text-gray-400 hover:text-gray-600 transition-all",
                        isCollapsed
                            ? "absolute -right-3 top-6 h-6 w-6 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 z-50"
                            : "h-8 w-8"
                    )}
                >
                    {isCollapsed ? <ChevronsRight className="w-3 h-3" /> : <PanelLeftClose className="w-5 h-5" />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 overflow-x-hidden">
                {/* Top: Minha Semana (Global) */}
                <div className="mb-6">
                    <ul className="space-y-1">
                        {personalItems.map((item) => (
                            <li key={item.href}>
                                <NavItemView item={item} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
                            </li>
                        ))}
                    </ul>
                    <div className={cn("mt-4 border-b border-gray-100 mx-3", isCollapsed && "mx-1")} />
                </div>

                {/* Workspace Selector */}
                <div className="mb-6 relative">
                    {hasWorkspaces ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full h-12 gap-3 hover:bg-gray-100/80 transition-all group p-0",
                                        isCollapsed ? "justify-center px-0" : "justify-start px-3"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:shadow transition-shadow overflow-hidden">
                                        {currentWorkspace?.logo_url ? (
                                            <img
                                                src={currentWorkspace.logo_url}
                                                alt={currentWorkspace.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Building2 className="w-4 h-4" />
                                        )}
                                    </div>

                                    {!isCollapsed && (
                                        <>
                                            <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                                <div className="flex items-center gap-2 w-full">
                                                    <span className="font-semibold text-sm text-gray-900 truncate">
                                                        {currentWorkspace?.name || "Selecione"}
                                                    </span>
                                                    {isTrialing && trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                                                        <Link 
                                                            href="/billing"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex-shrink-0"
                                                        >
                                                            <Badge 
                                                                variant="secondary" 
                                                                className="text-[10px] px-1.5 h-4 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 cursor-pointer transition-colors"
                                                            >
                                                                {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}
                                                            </Badge>
                                                        </Link>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-500 truncate group-hover:text-gray-700 transition-colors">
                                                    {isTrialing ? 'Plano Trial' : subscriptionData?.plan ? `Plano ${subscriptionData.plan.charAt(0).toUpperCase() + subscriptionData.plan.slice(1)}` : 'Workspace'}
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
                                            // Prefetch route on hover for faster navigation
                                            const base = workspace.slug || workspace.id;
                                            if (base) {
                                                router.prefetch(`/${base}/tasks`);
                                            }
                                        }}
                                        onClick={() => {
                                            setActiveWorkspaceId(workspace.id);
                                            const base = workspace.slug || workspace.id;
                                            if (base) {
                                                router.push(`/${base}/tasks`);
                                            }
                                        }}
                                        className="gap-2 cursor-pointer"
                                    >
                                        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
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
                                        <span className="flex-1 truncate">{workspace.name}</span>
                                        {workspace.id === activeWorkspaceId && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer gap-2 text-green-600 focus:text-green-700 focus:bg-green-50">
                                    <Link href="/onboarding">
                                        <Plus className="w-4 h-4" />
                                        Criar Novo Workspace
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link
                            href="/onboarding"
                            className={cn(
                                "flex items-center justify-center gap-2 w-full h-10 text-sm border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-green-600 hover:border-green-500 hover:bg-green-50 transition-all",
                                isCollapsed ? "px-0" : ""
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            {!isCollapsed && "Criar Workspace"}
                        </Link>
                    )}
                </div>

                {/* Workspace Menu Items */}
                <div>
                    <ul className="space-y-1">
                        {workspaceItems.map((item) => {
                            const href = workspacePrefix + item.href;
                            const resolvedItem = { ...item, href };
                            return (
                                <li key={item.href}>
                                    <NavItemView
                                        item={resolvedItem}
                                        isActive={isActive(href)}
                                        isCollapsed={isCollapsed}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 mt-auto space-y-3">
                {/* Trial Upgrade Callout - Hide when collapsed and only show if trialing */}
                {!isCollapsed && isTrialing && trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <h4 className="font-semibold text-green-800 text-xs mb-1">
                            Trial - {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                        </h4>
                        <p className="text-[10px] text-green-700 mb-2 leading-snug">
                            Aproveite todos os recursos Pro do Symples.
                        </p>
                        <Button 
                            size="sm" 
                            className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white shadow-none"
                            onClick={() => router.push('/billing')}
                        >
                            Assinar Agora
                        </Button>
                    </div>
                )}

                <div className={cn("flex items-center", isCollapsed ? "justify-center flex-col gap-4" : "justify-between")}>
                    {/* Settings Link */}
                    <NavItemView
                        item={{ label: "Configurações", href: "/settings", icon: Settings }}
                        isActive={isActive("/settings")}
                        isCollapsed={isCollapsed}
                    />
                </div>
            </div>
        </aside>
    );
}

export function Sidebar(props: SidebarProps) {
    return (
        <Suspense fallback={
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-50">
                <div className="p-4 border-b border-gray-200">
                    <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
                </div>
                <nav className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
                        ))}
                    </div>
                </nav>
            </aside>
        }>
            <SidebarContent {...props} />
        </Suspense>
    );
}
