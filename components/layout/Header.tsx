"use client";

import React from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { UserNav } from "@/components/layout/UserNav";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

interface HeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
        role?: 'owner' | 'admin' | 'member' | 'viewer';
    } | null;
}

export function Header({ user }: HeaderProps) {
    return (
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Busca Global */}
            <div className="flex-1 max-w-md">
                <GlobalSearch />
            </div>

            {/* Ações & Perfil */}
            <div className="flex items-center gap-2 ml-4">
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

