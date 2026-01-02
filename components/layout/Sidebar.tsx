"use client";

import React, { useState, useMemo, useCallback, startTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, CheckSquare, DollarSign, Settings, Building2, Sparkles, Plus, ChevronsUpDown, ChevronsLeft, ChevronsRight, PanelLeftClose, PanelLeftOpen, Calendar } from "lucide-react";
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
import type { SubscriptionData } from "@/lib/types/subscription";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const personalItems: NavItem[] = [
    { label: "Home", href: "/home", icon: Home },
    { label: "Planner", href: "/planner", icon: Calendar },
    // Assistente IA agora acessível via FAB (GlobalAssistantSheet)
    // { label: "Assistente IA", href: "/assistant", icon: Sparkles },
];

const workspaceItems: NavItem[] = [
    { label: "Tarefas", href: "/tasks", icon: CheckSquare },
    { label: "Financeiro", href: "/finance", icon: DollarSign },
];

interface SidebarProps {
    workspaces?: { id: string; name: string; slug: string | null; logo_url?: string | null }[];
    initialSubscription?: Pick<SubscriptionData, 'id' | 'plan' | 'subscription_status' | 'trial_ends_at'> | null;
}

function NavItemView({ item, isActive, isCollapsed }: { item: NavItem, isActive: boolean, isCollapsed: boolean }) {
    const Icon = item.icon;

    const handleClick = () => {
        const clickTime = performance.now();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sidebar.tsx:49',message:'Link clicked',data:{href:item.href,clickTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
    };

    const linkElement = (
        <Link
            href={item.href}
            prefetch={true}
            onClick={handleClick}
            className={cn(
                "flex items-center gap-3 rounded-lg transition-colors duration-75 relative group whitespace-nowrap",
                isCollapsed ? "justify-center p-2 h-10 w-10 mx-auto" : "px-3 py-2 text-sm w-full",
                isActive
                    ? "bg-gray-50 text-[#050815] font-semibold"
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
            )}
        >
            <Icon className={cn(
                "flex-shrink-0",
                isCollapsed ? "w-5 h-5" : "w-5 h-5",
                isActive ? "text-[#050815]" : "text-gray-500"
            )} />
            <span className={cn(
                "transition-all duration-150 overflow-hidden",
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
                    {linkElement}
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[100]">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkElement;
}

function SidebarContent({ workspaces = [], initialSubscription = null }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
    const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);

    // Calcular dias restantes do trial (memoizado) - apenas lógica visual baseada em props
    const trialDaysRemaining = useMemo(() => {
        if (!initialSubscription?.trial_ends_at) return null;
        const trialEndsAt = new Date(initialSubscription.trial_ends_at);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining > 0 ? daysRemaining : 0;
    }, [initialSubscription?.trial_ends_at]);

    const isTrialing = initialSubscription?.subscription_status === 'trialing';

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

    // Memoizar pathname para evitar recálculos - usar useMemo para estabilizar referência
    const stablePathname = useMemo(() => pathname, [pathname]);
    
    // Memoizar resultados de isActive para cada href - evita recálculos durante render
    // Usar apenas pathname (sem searchParams) para evitar re-renders em cascata
    const activeStates = useMemo(() => {
        const states: Record<string, boolean> = {};
        // Calcular todos os estados ativos de uma vez (sem searchParams para evitar cascata)
        const checkActive = (href: string) => {
            // Fast path 1: comparação exata (mais comum)
            if (stablePathname === href) return true;
            
            // Fast path 2: startsWith para rotas workspace (segundo mais comum)
            if (stablePathname?.startsWith(href)) {
                // Rotas exatas não devem ativar com subpaths
                if (href === "/home" || href === "/settings") {
                    return false; // já verificamos === acima
                }
                // Para rotas workspace, verificar se é exatamente o prefixo ou subpath válido
                const remaining = stablePathname.slice(href.length);
                return remaining === "" || remaining.startsWith("/");
            }

            return false;
        };

        // Calcular estados para todos os itens pessoais
        personalItems.forEach(item => {
            states[item.href] = checkActive(item.href);
        });

        // Calcular estados para todos os itens workspace
        workspaceItems.forEach(item => {
            const href = item.href === "/finance" ? "/finance" : workspacePrefix + item.href;
            states[href] = checkActive(href);
        });

        // Settings (verificação simples sem tab)
        states["/settings"] = stablePathname === "/settings";

        return states;
    }, [stablePathname, workspacePrefix]);

    // Função isActive simplificada - apenas retorna valor memoizado
    const isActive = useCallback((href: string) => {
        return activeStates[href] ?? false;
    }, [activeStates]);

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
                <Link href="/home" prefetch={true} className={cn("block", isCollapsed ? "mx-auto" : "")}>
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
                {/* Top: Pessoal */}
                <div className="mb-6">
                    {!isCollapsed && (
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                            PESSOAL
                        </h2>
                    )}
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
                    {!isCollapsed && (
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                            ESPAÇOS DE TRABALHO
                        </h2>
                    )}
                    {hasWorkspaces ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full h-12 gap-3 hover:bg-gray-100/80 transition-all group p-0 border border-gray-200 rounded-lg",
                                        isCollapsed ? "justify-center px-0" : "justify-start px-3"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-md bg-[#050815] flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:shadow transition-shadow overflow-hidden">
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
                                                    {isTrialing ? 'Plano Trial' : initialSubscription?.plan ? `Plano ${initialSubscription.plan.charAt(0).toUpperCase() + initialSubscription.plan.slice(1)}` : 'Workspace'}
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
                                                router.prefetch(`/${base}/tasks`);
                                                // Prefetch subscription data
                                                fetch(`/api/workspace/subscription?workspaceId=${workspace.id}`).catch(() => {});
                                            }
                                        }}
                                        onClick={() => {
                                            if (workspace.id === activeWorkspaceId) return;
                                            
                                            setIsSwitchingWorkspace(true);
                                            setActiveWorkspaceId(workspace.id);
                                            
                                            const base = workspace.slug || workspace.id;
                                            if (base) {
                                                startTransition(() => {
                                                    router.push(`/${base}/tasks`);
                                                    // Reset loading state after navigation
                                                    setTimeout(() => setIsSwitchingWorkspace(false), 500);
                                                });
                                            } else {
                                                setIsSwitchingWorkspace(false);
                                            }
                                        }}
                                        className={cn(
                                            "gap-2 cursor-pointer",
                                            isSwitchingWorkspace && workspace.id !== activeWorkspaceId && "opacity-50"
                                        )}
                                        disabled={isSwitchingWorkspace}
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
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#050815]" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer gap-2 text-[#050815] focus:text-[#050815] focus:bg-gray-50">
                                    <Link href="/onboarding" prefetch={true}>
                                        <Plus className="w-4 h-4" />
                                        Criar Novo Workspace
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link
                            href="/onboarding"
                            prefetch={true}
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

                {/* Workspace Menu Items */}
                <div>
                    <ul className="space-y-1">
                        {workspaceItems.map((item) => {
                            const href = item.href === "/finance" ? "/finance" : workspacePrefix + item.href;
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
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <h4 className="font-semibold text-[#050815] text-xs mb-1">
                            Trial - {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                        </h4>
                        <p className="text-[10px] text-[#050815] mb-2 leading-snug">
                            Aproveite todos os recursos Pro do Symples.
                        </p>
                        <Button 
                            size="sm" 
                            className="w-full h-7 text-xs bg-[#050815] hover:bg-[#0a0f1f] text-white shadow-none"
                            onClick={() => router.push('/billing')}
                        >
                            Assinar Agora
                        </Button>
                    </div>
                )}

                <div className={cn("flex items-center", isCollapsed ? "justify-center flex-col gap-4" : "justify-between")}>
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
    return <SidebarContent {...props} />;
}
