import { getAdminWorkspaces } from "@/lib/actions/admin";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { WorkspaceActions } from "@/components/admin/WorkspaceActions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function AdminWorkspacesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const q = (await searchParams).q;
    const workspaces = await getAdminWorkspaces(q);

    const getPlanBadge = (plan: string | null) => {
        switch (plan) {
            case 'pro': return <Badge className="bg-blue-600 hover:bg-blue-700">Pro</Badge>;
            case 'business': return <Badge className="bg-purple-600 hover:bg-purple-700">Business</Badge>;
            case 'agency': return <Badge className="bg-emerald-600 hover:bg-emerald-700">Agency</Badge>;
            default: return <Badge variant="secondary">Pessoal</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Workspaces</h2>
                    <p className="text-muted-foreground">
                        Visão geral de todos os workspaces e planos.
                    </p>
                </div>
                <AdminSearch placeholder="Nome da empresa..." />
            </div>

            <Card className="border-none shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium">Workspace</th>
                                <th className="px-6 py-4 font-medium">Dono</th>
                                <th className="px-6 py-4 font-medium">Plano</th>
                                <th className="px-6 py-4 font-medium">Membros</th>
                                <th className="px-6 py-4 font-medium">Criado em</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {workspaces.map((ws: any) => (
                                <tr key={ws.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{ws.name}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{ws.slug}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {ws.owner ? (
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs">
                                                    <div className="font-medium text-gray-700">{ws.owner.full_name}</div>
                                                    <div className="text-muted-foreground">{ws.owner.email}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getPlanBadge(ws.plan)}
                                        {ws.subscription_status === 'trialing' && (
                                            <span className="ml-2 text-xs text-orange-600 font-medium">TRIAL</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {ws.members?.[0]?.count || 0}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {ws.created_at
                                            ? format(new Date(ws.created_at), "dd/MM/yyyy", { locale: ptBR })
                                            : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <WorkspaceActions
                                            workspaceId={ws.id}
                                            currentPlan={ws.plan || 'starter'}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {workspaces.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum workspace encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
