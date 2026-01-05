import { getAdminDashboardStats } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Building2, TrendingUp } from "lucide-react";

export default async function AdminDashboardPage() {
    const { stats, recentUsers } = await getAdminDashboardStats();

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Usuários Totais
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users}</div>
                        <p className="text-xs text-muted-foreground">
                            Base total de cadastros
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Workspaces Ativos
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.workspaces}</div>
                        <p className="text-xs text-muted-foreground">
                            Empresas na plataforma
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Novos (24h)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">+{stats.newUsers24h}</div>
                        <p className="text-xs text-muted-foreground">
                            Crescimento diário
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Últimos Cadastros</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.avatar_url || ""} />
                                            <AvatarFallback>{user.full_name?.[0] || "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.full_name || "Sem nome"}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(user.created_at || ""), { addSuffix: true, locale: ptBR })}
                                    </div>
                                </div>
                            ))}

                            {recentUsers.length === 0 && (
                                <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
