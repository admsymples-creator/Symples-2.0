"use client";

import { useState } from "react";
import { updateWorkspacePlan } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, ShieldCheck, Shield } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface WorkspaceActionsProps {
    workspaceId: string;
    currentPlan: string;
}

export function WorkspaceActions({ workspaceId, currentPlan }: WorkspaceActionsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdatePlan = async (newPlan: 'starter' | 'pro' | 'business') => {
        setIsLoading(true);
        try {
            await updateWorkspacePlan(workspaceId, newPlan);
            toast.success(`Plano alterado para ${newPlan.toUpperCase()}`);
            // Force refresh is better handled by parent or router.refresh() 
            // In a server component list, we usually rely on router.refresh()
            window.location.reload();
        } catch (error) {
            toast.error("Erro ao atualizar plano");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(workspaceId)}>
                    Copiar ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Alterar Plano</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleUpdatePlan('starter')} disabled={currentPlan === 'starter'}>
                    <Badge variant="outline" className="mr-2">S</Badge> Starter (Free)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdatePlan('pro')} disabled={currentPlan === 'pro'}>
                    <Badge variant="default" className="mr-2 bg-blue-600 hover:bg-blue-700">P</Badge> Pro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdatePlan('business')} disabled={currentPlan === 'business'}>
                    <Badge variant="default" className="mr-2 bg-purple-600 hover:bg-purple-700">B</Badge> Business
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
