import { getAdminAuditLogs } from "@/lib/actions/admin";
import { AuditLogsDataTable } from "@/components/admin/audit-logs-table/AuditLogsDataTable";
import type { AdminTableParams } from "@/types/admin";

export default async function AdminAuditLogsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const sp = await searchParams;
    const params: AdminTableParams = {
        page: sp.page ? Number(sp.page) : 1,
        pageSize: sp.pageSize ? Number(sp.pageSize) : 20,
        q: sp.q || undefined,
    };

    const result = await getAdminAuditLogs(params);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
                <p className="text-muted-foreground">
                    Historico de acoes administrativas na plataforma.
                </p>
            </div>

            <AuditLogsDataTable result={result} />
        </div>
    );
}
