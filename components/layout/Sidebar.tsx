"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, CheckSquare, DollarSign, Settings, Building2, Sparkles, Plus, ChevronsUpDown } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const personalItems: NavItem[] = [
    { label: "Minha Semana", href: "/home", icon: Home },
    { label: "Assistente IA", href: "/assistant", icon: Sparkles },
];

const workspaceItems: NavItem[] = [
    { label: "Tarefas", href: "/tasks", icon: CheckSquare },
    { label: "Financeiro", href: "/finance", icon: DollarSign },
];

interface SidebarProps {
    workspaces?: { id: string; name: string; slug: string | null; logo_url?: string | null }[];
}

function SidebarContent({ workspaces = [] }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isActive = (href: string) => {
        // Tratamento para links com query params (ex: /settings?tab=members)
        if (href.includes('?')) {
            const [path, query] = href.split('?');
            const params = new URLSearchParams(query);
            const targetTab = params.get('tab');
            const currentTab = searchParams.get('tab');
            
            return pathname === path && currentTab === targetTab;
        }

        // Tratamento específico para /settings (sem tab na URL)
        if (href === "/settings") {
            // Só ativo se estiver em settings e não tiver tab ou tab for general
            return pathname === "/settings" && (!searchParams.get('tab') || searchParams.get('tab') === 'general');
        }

        if (href === "/home") {
            return pathname === "/home";
        }
        return pathname?.startsWith(href);
    };

    // Workspaces vindos via props
    // Se não houver workspaces, podemos mostrar um estado vazio ou botão de criar
    const hasWorkspaces = workspaces.length > 0;
    const [selectedWorkspace, setSelectedWorkspace] = React.useState(
        hasWorkspaces ? workspaces[0].id : ""
    );

    // Atualizar workspace selecionado se a lista mudar
    React.useEffect(() => {
        if (hasWorkspaces && !workspaces.find(w => w.id === selectedWorkspace)) {
             setSelectedWorkspace(workspaces[0].id);
        }
    }, [workspaces, hasWorkspaces, selectedWorkspace]);

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
            {/* Logo */}
            <div className="p-4 border-b border-gray-200">
                <Link href="/home" className="block">
                    <Image
                        src="/logo-black.svg"
                        alt="Symples"
                        width={120}
                        height={36}
                        priority
                        className="h-8 w-auto"
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                {/* Top: Minha Semana (Global) */}
                <div className="mb-6">
                    <ul className="space-y-1">
                        {personalItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                            active
                                                ? "bg-green-50 text-green-700 font-semibold"
                                                : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-5 h-5",
                                            active ? "text-green-700" : "text-gray-500"
                                        )} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-4 border-b border-gray-100 mx-3" />
                </div>

                {/* Separator - Removed old header */}
                <div className="mb-2">
                    
                    {/* Workspace Selector */}
                    <div className="mb-2">
                        {hasWorkspaces ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        className="w-full justify-start px-3 h-12 gap-3 hover:bg-gray-100/80 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:shadow transition-shadow overflow-hidden">
                                            {workspaces.find(w => w.id === selectedWorkspace)?.logo_url ? (
                                                <img 
                                                    src={workspaces.find(w => w.id === selectedWorkspace)?.logo_url!} 
                                                    alt={workspaces.find(w => w.id === selectedWorkspace)?.name} 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Building2 className="w-4 h-4" />
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                            <div className="flex items-center gap-2 w-full">
                                                <span className="font-semibold text-sm text-gray-900 truncate">
                                                    {workspaces.find(w => w.id === selectedWorkspace)?.name || "Selecione"}
                                                </span>
                                                {/* Trial Badge - Mocked Logic */}
                                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 flex-shrink-0">
                                                    14 dias
                                                </Badge>
                                            </div>
                                            <span className="text-[10px] text-gray-500 truncate group-hover:text-gray-700 transition-colors">
                                                Plano Trial
                                            </span>
                                        </div>

                                        <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-auto opacity-50 group-hover:opacity-100" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[220px]" align="start">
                                    <DropdownMenuLabel className="text-xs text-gray-500 font-medium px-2 py-1.5">
                                        Trocar Workspace
                                    </DropdownMenuLabel>
                                    {workspaces.map((workspace) => (
                                        <DropdownMenuItem 
                                            key={workspace.id} 
                                            onClick={() => setSelectedWorkspace(workspace.id)}
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
                                            {workspace.id === selectedWorkspace && (
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
                                className="flex items-center justify-center gap-2 w-full h-10 text-sm border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-green-600 hover:border-green-500 hover:bg-green-50 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Criar Workspace
                            </Link>
                        )}
                    </div>
                </div>

                {/* Workspace Menu Context */}
                <div>
                    <ul className="space-y-1">
                        {workspaceItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                            active
                                                ? "bg-green-50 text-green-700 font-semibold"
                                                : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-5 h-5",
                                            active ? "text-green-700" : "text-gray-500"
                                        )} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 mt-auto space-y-3">
                {/* Trial Upgrade Callout */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <h4 className="font-semibold text-green-800 text-xs mb-1">Trial - 14 dias restantes</h4>
                    <p className="text-[10px] text-green-700 mb-2 leading-snug">
                        Aproveite todos os recursos Pro do Symples.
                    </p>
                    <Button size="sm" className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white shadow-none">
                        Assinar Agora
                    </Button>
                </div>

                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive("/settings")
                            ? "bg-gray-100 text-gray-900 font-semibold"
                            : "text-gray-500 font-medium hover:bg-gray-50 hover:text-gray-900"
                    )}
                >
                    <Settings className={cn(
                        "w-5 h-5",
                        isActive("/settings") ? "text-gray-900" : "text-gray-400"
                    )} />
                    Configurações
                </Link>
            </div>
        </aside>
    );
}

export function Sidebar(props: SidebarProps) {
    return (
        <Suspense fallback={
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
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

