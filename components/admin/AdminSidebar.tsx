"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Building2,
    ClipboardList,
    LogOut,
    PanelLeftClose,
    PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminSidebar } from "./AdminSidebarContext";

const menuItems = [
    {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "Usuarios",
        href: "/admin/users",
        icon: Users,
    },
    {
        title: "Workspaces",
        href: "/admin/workspaces",
        icon: Building2,
    },
    {
        title: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ClipboardList,
    },
];

function AdminSidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggle } = useAdminSidebar();

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-50 bg-slate-900 text-white flex flex-col transition-all duration-200",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                {!isCollapsed && (
                    <Link href="/admin" className="flex items-center gap-3 font-bold text-lg">
                        <Image
                            src="/logo-dock.svg"
                            alt="Symples"
                            width={120}
                            height={32}
                            priority
                        />
                    </Link>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={toggle}
                >
                    {isCollapsed ? (
                        <PanelLeft className="h-4 w-4" />
                    ) : (
                        <PanelLeftClose className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-6 space-y-1">
                {menuItems.map((item) => {
                    const isActive =
                        item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);

                    const linkContent = (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isCollapsed && "justify-center px-2",
                                isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!isCollapsed && item.title}
                        </Link>
                    );

                    if (isCollapsed) {
                        return (
                            <Tooltip key={item.href} delayDuration={0}>
                                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                <TooltipContent side="right" className="text-xs">
                                    {item.title}
                                </TooltipContent>
                            </Tooltip>
                        );
                    }

                    return <div key={item.href}>{linkContent}</div>;
                })}
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-slate-800">
                {isCollapsed ? (
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
                                asChild
                            >
                                <Link href="/home">
                                    <LogOut className="w-5 h-5" />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                            Voltar ao App
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                        asChild
                    >
                        <Link href="/home">
                            <LogOut className="w-5 h-5 mr-2" />
                            Voltar ao App
                        </Link>
                    </Button>
                )}
            </div>
        </aside>
    );
}

export { AdminSidebar };
