"use client";

/**
 * ⚠️ SEGURANÇA: Esta página deve ser protegida por uma verificação de 
 * system_role === 'super_admin' no servidor antes de renderizar dados sensíveis.
 */

import React, { useState, useMemo } from "react";
import { Search, Shield, AlertTriangle, Calendar, UserCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Tipos
interface MockUser {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    workspace: string;
    integrationStatus: "healthy" | "error" | "warning";
    plan: string;
    trialExpiresAt?: string;
    userId: string;
}

// Dados Mock
const MOCK_USERS: MockUser[] = [
    {
        id: "1",
        name: "Ana Silva",
        email: "ana@empresa.com",
        workspace: "Empresa ABC",
        integrationStatus: "error",
        plan: "Pro (Trial)",
        trialExpiresAt: "2025-02-14",
        userId: "usr_abc123",
    },
    {
        id: "2",
        name: "Carlos Dev",
        email: "carlos@startup.io",
        workspace: "Startup XYZ",
        integrationStatus: "healthy",
        plan: "Business",
        userId: "usr_def456",
    },
    {
        id: "3",
        name: "Marcos",
        email: "marcos@freelancer.com",
        workspace: "Freelancer Solo",
        integrationStatus: "warning",
        plan: "Pro (Trial)",
        trialExpiresAt: new Date().toISOString().split('T')[0], // Hoje
        userId: "usr_ghi789",
    },
];

export default function AdminPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
    const [activeKPI, setActiveKPI] = useState<string | null>(null);

    // Filtros
    const filteredUsers = useMemo(() => {
        let filtered = MOCK_USERS;

        // Filtro de busca
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (user) =>
                    user.name.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query) ||
                    user.workspace.toLowerCase().includes(query)
            );
        }

        // Filtro por KPI
        if (activeKPI === "errors") {
            filtered = filtered.filter((user) => user.integrationStatus === "error");
        } else if (activeKPI === "trials") {
            filtered = filtered.filter((user) => user.trialExpiresAt);
        } else if (activeKPI === "invites") {
            // Mock: considerar usuários com warning como "convites travados"
            filtered = filtered.filter((user) => user.integrationStatus === "warning");
        }

        return filtered;
    }, [searchQuery, activeKPI]);

    // Estatísticas
    const criticalErrors = MOCK_USERS.filter((u) => u.integrationStatus === "error").length;
    const expiringTrials = MOCK_USERS.filter((u) => u.trialExpiresAt).length;
    const stuckInvites = MOCK_USERS.filter((u) => u.integrationStatus === "warning").length;
    const newWorkspaces = 3; // Hardcoded por enquanto

    const getStatusBadge = (status: MockUser["integrationStatus"]) => {
        switch (status) {
            case "error":
                return (
                    <Badge variant="destructive" className="bg-red-600">
                        ⚠️ Falha Webhook
                    </Badge>
                );
            case "warning":
                return (
                    <Badge className="bg-yellow-500 text-white">
                        ⚠️ Atenção
                    </Badge>
                );
            case "healthy":
                return (
                    <Badge className="bg-green-600 text-white">
                        ✓ Online
                    </Badge>
                );
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="border-b border-border bg-surface p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-foreground">Support Cockpit</h1>
                        <Badge className="bg-red-50 text-red-700 border-red-200">
                            <Shield className="w-3 h-3 mr-1" />
                            SUPER ADMIN
                        </Badge>
                    </div>
                </div>

                {/* Busca Global */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Buscar por nome, email ou workspace..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* KPIs Operacionais - Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* Card 1: Erros Críticos */}
                    <Card
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md border-l-4",
                            activeKPI === "errors" ? "ring-2 ring-red-300" : "",
                            "border-red-500 bg-red-50"
                        )}
                        onClick={() => setActiveKPI(activeKPI === "errors" ? null : "errors")}
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Erros Críticos (24h)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-red-600">{criticalErrors}</span>
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Trials Expirando */}
                    <Card
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md border-l-4",
                            activeKPI === "trials" ? "ring-2 ring-yellow-300" : "",
                            "border-yellow-500 bg-white"
                        )}
                        onClick={() => setActiveKPI(activeKPI === "trials" ? null : "trials")}
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Trials Expirando
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-gray-900">{expiringTrials}</span>
                                <Calendar className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Convites Travados */}
                    <Card
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md border-l-4",
                            activeKPI === "invites" ? "ring-2 ring-slate-300" : "",
                            "border-slate-400 bg-white"
                        )}
                        onClick={() => setActiveKPI(activeKPI === "invites" ? null : "invites")}
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Convites Travados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-gray-900">{stuckInvites}</span>
                                <UserCircle className="w-8 h-8 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: Novos Workspaces */}
                    <Card
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md border-l-4",
                            "border-green-500 bg-white"
                        )}
                        onClick={() => setActiveKPI(null)}
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Novos Workspaces
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-gray-900">{newWorkspaces}</span>
                                <Activity className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Master View - Tabela */}
            <div className="flex-1 overflow-auto p-6">
                <div className="rounded-lg border border-border overflow-hidden bg-surface">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Usuário</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Workspace</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Status Integração</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Plano</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        Nenhum usuário encontrado
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={cn(
                                            "border-b border-border cursor-pointer transition-colors hover:bg-muted/30",
                                            user.integrationStatus === "error" &&
                                                "bg-red-50/40 border-l-4 border-l-red-500"
                                        )}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-foreground">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-foreground">{user.workspace}</td>
                                        <td className="p-4">{getStatusBadge(user.integrationStatus)}</td>
                                        <td className="p-4 text-foreground">{user.plan}</td>
                                        <td className="p-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedUser(user);
                                                }}
                                            >
                                                Ver Detalhes
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail View - Sheet Lateral */}
            <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
                    {selectedUser && (
                        <>
                            <SheetHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={selectedUser.avatar} />
                                            <AvatarFallback>
                                                {getInitials(selectedUser.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <SheetTitle>{selectedUser.name}</SheetTitle>
                                            <SheetDescription>
                                                ID: {selectedUser.userId}
                                            </SheetDescription>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                    >
                                        Impersonate
                                    </Button>
                                </div>
                            </SheetHeader>

                            <Tabs defaultValue={selectedUser.integrationStatus === "error" ? "debug" : "profile"} className="mt-6">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="debug">Debug</TabsTrigger>
                                    <TabsTrigger value="billing">Billing</TabsTrigger>
                                    <TabsTrigger value="profile">Profile</TabsTrigger>
                                </TabsList>

                                {/* Aba Debug */}
                                <TabsContent value="debug" className="mt-4">
                                    <div className="rounded-lg bg-slate-950 p-4 font-mono text-sm overflow-x-auto">
                                        <div className="text-green-400 mb-2">
                                            $ n8n webhook status check
                                        </div>
                                        <div className="text-green-400">
                                            [2025-02-07 14:23:15] Checking webhook endpoint...
                                        </div>
                                        <div className="text-red-400 mt-2">
                                            [2025-02-07 14:23:16] ❌ ERROR 500: Internal Server Error
                                        </div>
                                        <div className="text-red-400 mt-1">
                                            Response: {`{`}
                                        </div>
                                        <div className="text-red-400 ml-4">
                                            "error": "Webhook execution failed",
                                        </div>
                                        <div className="text-red-400 ml-4">
                                            "details": "Database connection timeout",
                                        </div>
                                        <div className="text-red-400 ml-4">
                                            "timestamp": "2025-02-07T14:23:16Z"
                                        </div>
                                        <div className="text-red-400">{`}`}</div>
                                        <div className="text-yellow-400 mt-3">
                                            [2025-02-07 14:23:17] ⚠️ Retry attempt 1/3...
                                        </div>
                                        <div className="text-red-400 mt-1">
                                            [2025-02-07 14:23:18] ❌ Retry failed
                                        </div>
                                    </div>
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Ação Sugerida:</strong> Verificar conexão com Supabase e
                                            validar credenciais do webhook no n8n.
                                        </p>
                                    </div>
                                </TabsContent>

                                {/* Aba Billing */}
                                <TabsContent value="billing" className="mt-4 space-y-4">
                                    <div className="p-4 border border-border rounded-lg">
                                        <h3 className="font-semibold mb-2 text-foreground">Plano Atual</h3>
                                        <p className="text-2xl font-bold text-foreground">{selectedUser.plan}</p>
                                        {selectedUser.trialExpiresAt && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Trial expira em: {new Date(selectedUser.trialExpiresAt).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-foreground">Ações de Cura</h3>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => {
                                                    // TODO: Implementar ação de estender trial
                                                    alert("Estender Trial +7 dias");
                                                }}
                                            >
                                                Estender Trial (+7 dias)
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => {
                                                    // TODO: Implementar ação de sincronizar Stripe
                                                    alert("Sincronizar Stripe");
                                                }}
                                            >
                                                Sincronizar Stripe
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Aba Profile */}
                                <TabsContent value="profile" className="mt-4 space-y-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Nome</label>
                                            <p className="text-foreground">{selectedUser.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Email</label>
                                            <p className="text-foreground">{selectedUser.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Workspace</label>
                                            <p className="text-foreground">{selectedUser.workspace}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">User ID</label>
                                            <p className="text-foreground font-mono text-sm">{selectedUser.userId}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Status</label>
                                            <div className="mt-1">{getStatusBadge(selectedUser.integrationStatus)}</div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}