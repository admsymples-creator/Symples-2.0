import { getAdminUsers } from "@/lib/actions/admin";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminUserPlanActions } from "@/components/admin/AdminUserPlanActions";
import { AdminSupportLoginButton } from "@/components/admin/AdminSupportLoginButton";
import { AdminTrialInviteCard } from "@/components/admin/AdminTrialInviteCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { getDisplayPlanName, getPlanLimits } from "@/lib/utils/subscription-helpers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const q = (await searchParams).q;
    const users = await getAdminUsers(q);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
                    <p className="text-muted-foreground">
                        Gerencie todos os usuarios registrados na plataforma.
                    </p>
                </div>
                <AdminSearch placeholder="Nome ou Email..." />
            </div>

            <AdminTrialInviteCard />

            <Card className="border-none shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium">Usuario</th>
                                <th className="px-6 py-4 font-medium">Cargo</th>
                                <th className="px-6 py-4 font-medium">Data Cadastro</th>
                                <th className="px-6 py-4 font-medium">WhatsApp</th>
                                <th className="px-6 py-4 font-medium">Trial?</th>
                                <th className="px-6 py-4 font-medium">Plano Expira em</th>
                                <th className="px-6 py-4 font-medium">Cota de Workspace</th>
                                <th className="px-6 py-4 font-medium">Plano</th>
                                <th className="px-6 py-4 font-medium text-right">Acoes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((user) => {
                                const primaryWorkspace = (user as any).primaryWorkspace;
                                const primaryMembership = (user as any).primaryMembership;
                                const primaryWorkspaceMemberCount = (user as any).primaryWorkspaceMemberCount ?? 0;
                                const accountPlan = (user as any).account_plan || null;
                                const currentPlan = accountPlan || primaryWorkspace?.plan || null;
                                const subscriptionStatus = primaryWorkspace?.subscription_status || null;
                                const isTrialing = subscriptionStatus === "trialing" || subscriptionStatus === "trial";
                                const trialEndsAt = primaryWorkspace?.trial_ends_at
                                    ? format(new Date(primaryWorkspace.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })
                                    : null;
                                const workspaceQuota = primaryWorkspace
                                    ? primaryWorkspace.member_limit ?? getPlanLimits(primaryWorkspace.plan || null, subscriptionStatus)
                                    : null;
                                const workspaceUsageLabel = primaryWorkspace
                                    ? `${primaryWorkspaceMemberCount}/${workspaceQuota ?? "-"}`
                                    : "-";
                                const role = primaryWorkspace ? "owner" : primaryMembership?.role || null;
                                const roleLabel = role === "owner"
                                    ? "Owner"
                                    : role === "admin"
                                        ? "Admin"
                                        : role === "member"
                                            ? "Membro"
                                            : role === "viewer"
                                                ? "Visualizador"
                                                : "-";

                                return (
                                <tr key={user.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-gray-100">
                                                <AvatarImage src={user.avatar_url || ""} />
                                                <AvatarFallback>{user.full_name?.[0] || "?"}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.full_name || "Sem nome"}</div>
                                                <div className="text-muted-foreground text-xs">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {roleLabel}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {user.created_at
                                            ? format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                            : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {user.whatsapp || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {primaryWorkspace ? (isTrialing ? "Sim" : "Nao") : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {primaryWorkspace && isTrialing && trialEndsAt ? trialEndsAt : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {workspaceUsageLabel}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {currentPlan ? getDisplayPlanName(primaryWorkspace?.plan || null, accountPlan) : "Sem workspace"}
                                        {primaryWorkspace?.name && (
                                            <div className="text-xs text-gray-400">
                                                {primaryWorkspace.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <AdminSupportLoginButton userId={user.id} userEmail={user.email} />
                                            <AdminUserPlanActions
                                                userId={user.id}
                                                currentPlan={currentPlan}
                                                accountPlan={accountPlan}
                                                hasWorkspace={Boolean(primaryWorkspace)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum usuario encontrado.
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
