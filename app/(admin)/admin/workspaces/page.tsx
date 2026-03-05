import { getAdminWorkspacesPaginated } from "@/lib/actions/admin";
import { WorkspacesDataTable } from "@/components/admin/workspaces-table/WorkspacesDataTable";
import type { AdminTableParams } from "@/types/admin";

export default async function AdminWorkspacesPage({
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
    };

    const result = await getAdminWorkspacesPaginated(params);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Workspaces</h2>
                <p className="text-muted-foreground">
                    Visao geral de todos os workspaces e planos.
                </p>
            </div>

            <WorkspacesDataTable result={result} />
        </div>
    );
}
