"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Building2,
    Settings,
    LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
    {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "Usuários",
        href: "/admin/users",
        icon: Users,
    },
    {
        title: "Workspaces",
        href: "/admin/workspaces",
        icon: Building2,
    },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        S
                    </div>
                    <span>SuperAdmin</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
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
            </div>
        </aside>
    );
}
