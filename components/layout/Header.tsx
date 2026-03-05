"use client";

import React from "react";
import Link from "next/link";
import { Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { UserNav } from "@/components/layout/UserNav";
import { useSidebar } from "@/components/providers/SidebarProvider";

interface HeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
        role?: 'owner' | 'admin' | 'member' | 'viewer';
    } | null;
}

export function Header({ user }: HeaderProps) {
    const { isCollapsed, toggleSidebar } = useSidebar();

    return (
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Toggle Sidebar Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-9 w-9 text-gray-400 hover:text-gray-600 transition-all"
                aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
                {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </Button>

            {/* Ações & Perfil */}
            <div className="flex items-center gap-2 ml-auto">
                {/* Notificações */}
                <NotificationsPopover userRole={user?.role} useMockData={false} />

                {/* Configurações */}
                <Link href="/settings">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Configurações"
                    >
                        <Settings className="w-5 h-5 text-gray-600" />
                    </Button>
                </Link>

                {/* User Nav (Avatar & Menu) */}
                <UserNav user={user} />
            </div>
        </header>
    );
}

