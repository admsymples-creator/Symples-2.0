"use client";

import { useState } from "react";
import { updateUserPlan } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { getPlanName } from "@/lib/utils/subscription-helpers";

interface AdminUserPlanActionsProps {
    userId: string;
    currentPlan?: string | null;
    accountPlan?: string | null;
    hasWorkspace: boolean;
}

export function AdminUserPlanActions({ userId, currentPlan, accountPlan, hasWorkspace }: AdminUserPlanActionsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdatePlan = async (newPlan: "starter" | "pro" | "business" | "agency") => {
        if (!hasWorkspace) return;

        setIsLoading(true);
        try {
            const result = await updateUserPlan(userId, newPlan);
            if (!result.success) {
                toast.error(result.error || "Erro ao atualizar plano do usuário");
                return;
            }
            toast.success(`Plano alterado para ${getPlanName(newPlan)}`);
            window.location.reload();
        } catch (error) {
            toast.error("Erro ao atualizar plano do usuário");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={!hasWorkspace}>
                    <span className="sr-only">Abrir menu</span>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Alterar Plano</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleUpdatePlan("starter")} disabled={currentPlan === "starter" && !accountPlan}>
                    <Badge variant="outline" className="mr-2">P</Badge> Pessoal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdatePlan("pro")} disabled={currentPlan === "pro" && !accountPlan}>
                    <Badge variant="default" className="mr-2 bg-blue-600 hover:bg-blue-700">P</Badge> Pro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdatePlan("business")} disabled={currentPlan === "business" && !accountPlan}>
                    <Badge variant="default" className="mr-2 bg-purple-600 hover:bg-purple-700">B</Badge> Business
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdatePlan("agency")} disabled={accountPlan === "agency"}>
                    <Badge variant="default" className="mr-2 bg-emerald-600 hover:bg-emerald-700">A</Badge> Agency
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
