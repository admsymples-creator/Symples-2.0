"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Settings, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "@/components/layout/NotificationsPopover";
import { UserNav } from "@/components/layout/UserNav";

interface HeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
    } | null;
}

export function Header({ user }: HeaderProps) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Atalho Cmd+K / Ctrl+K para focar na busca
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                document.getElementById("global-search")?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Busca Global */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        id="global-search"
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className={cn(
                            "pl-10 pr-20 h-9 w-full",
                            isSearchFocused && "ring-2 ring-green-500 border-green-500"
                        )}
                    />
                    {!isSearchFocused && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-gray-400 pointer-events-none">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">
                                ⌘K
                            </kbd>
                        </div>
                    )}
                </div>
            </div>

            {/* Ações & Perfil */}
            <div className="flex items-center gap-2 ml-4">
                {/* Notificações */}
                <NotificationsPopover />

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

