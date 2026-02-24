import { getAdminUsersPaginated } from "@/lib/actions/admin";
import { AdminTrialInviteCard } from "@/components/admin/AdminTrialInviteCard";
import { UsersDataTable } from "@/components/admin/users-table/UsersDataTable";
import type { AdminTableParams } from "@/types/admin";

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const sp = await searchParams;
    const params: AdminTableParams = {
        page: sp.page ? Number(sp.page) : 1,
        pageSize: sp.pageSize ? Number(sp.pageSize) : 20,
        sort: sp.sort || "created_at",
        order: (sp.order as "asc" | "desc") || "desc",
        q: sp.q || undefined,
        plan: sp.plan || undefined,
        status: sp.status || undefined,
    };

    const result = await getAdminUsersPaginated(params);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
                <p className="text-muted-foreground">
                    Gerencie todos os usuarios registrados na plataforma.
                </p>
            </div>

            <AdminTrialInviteCard />
            <UsersDataTable result={result} />
        </div>
    );
}
