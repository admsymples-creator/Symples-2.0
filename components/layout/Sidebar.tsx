"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, DollarSign, Users, Settings, Building2 } from "lucide-react";
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
];

const workspaceItems: NavItem[] = [
    { label: "Tarefas", href: "/tasks", icon: CheckSquare },
    { label: "Financeiro", href: "/finance", icon: DollarSign },
    { label: "Time", href: "/team", icon: Users },
];

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
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
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                            active
                                                ? "bg-indigo-50 text-indigo-600"
                                                : "text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-5 h-5",
                                            active ? "text-indigo-600" : "text-gray-500"
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
                                    <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
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
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                            active
                                                ? "bg-indigo-50 text-indigo-600"
                                                : "text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-5 h-5",
                                            active ? "text-indigo-600" : "text-gray-500"
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
            <div className="p-4 border-t border-gray-200 space-y-1">
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === "/settings"
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-gray-700 hover:bg-gray-50"
                    )}
                >
                    <Settings className={cn(
                        "w-5 h-5",
                        pathname === "/settings" ? "text-indigo-600" : "text-gray-500"
                    )} />
                    Configurações
                </Link>
            </div>
        </aside>
    );
}

