import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { AdminSidebarProvider } from "@/components/admin/AdminSidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayoutContent } from "@/components/admin/AdminLayoutContent";

export const dynamic = "force-dynamic";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TooltipProvider>
            <AdminSidebarProvider>
                <div className="min-h-screen bg-gray-50">
                    <AdminSidebar />
                    <AdminCommandPalette />
                    <AdminLayoutContent>
                        {children}
                    </AdminLayoutContent>
                </div>
            </AdminSidebarProvider>
        </TooltipProvider>
    );
}
