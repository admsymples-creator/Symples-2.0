import { getAdminUsers } from "@/lib/actions/admin";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
                    <h2 className="text-2xl font-bold tracking-tight">Usuários</h2>
                    <p className="text-muted-foreground">
                        Gerencie todos os usuários registrados na plataforma.
                    </p>
                </div>
                <AdminSearch placeholder="Nome ou Email..." />
            </div>

            <Card className="border-none shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium">Usuário</th>
                                <th className="px-6 py-4 font-medium">Data Cadastro</th>
                                <th className="px-6 py-4 font-medium">WhatsApp</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((user) => (
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
                                        {user.created_at
                                            ? format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                            : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {user.whatsapp || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs text-gray-400">Ver detalhes (em breve)</span>
                                        {/* Button para ver mais detalhes ou impersonate no futuro */}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum usuário encontrado.
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
