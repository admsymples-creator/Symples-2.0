import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <AdminSidebar />
            <main className="pl-64 min-h-screen">
                <div className="h-16 border-b border-gray-200 bg-white px-8 flex items-center justify-between sticky top-0 z-40">
                    <h1 className="font-semibold text-gray-700">Visão Geral do Sistema</h1>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                            SA
                        </div>
                    </div>
                </div>
                <div className="p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
