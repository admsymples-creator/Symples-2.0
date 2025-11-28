"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, CheckSquare, DollarSign, Settings, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

function SidebarContent() {
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

    // Mock workspaces - em produção viria de um contexto/estado global
    const workspaces = [
        { id: "1", name: "Agência V4" },
        { id: "2", name: "Consultoria Tech" },
        { id: "3", name: "Startup Alpha" },
    ];
    const [selectedWorkspace, setSelectedWorkspace] = React.useState("1");

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
                </div>

                {/* Separator */}
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                        ESPAÇO DE TRABALHO
                    </h3>
                    
                    {/* Workspace Selector */}
                    <div className="px-3 mb-4">
                        <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                            <SelectTrigger className="w-full h-9 text-sm">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {!selectedWorkspace && <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                                    <SelectValue placeholder="Selecione o Workspace" className="truncate" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {workspaces.map((workspace) => (
                                    <SelectItem key={workspace.id} value={workspace.id}>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-500" />
                                            {workspace.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
            <div className="p-4 border-t border-gray-200 mt-auto">
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

export function Sidebar() {
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
            <SidebarContent />
        </Suspense>
    );
}

