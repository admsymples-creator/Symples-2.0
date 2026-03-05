"use client";

import { useState } from "react";
import { 
    MoreHorizontal, 
    Edit,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteTransaction } from "@/lib/actions/finance";
import { ConfirmModal } from "@/components/modals/confirm-modal";

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    [key: string]: any;
}

interface TransactionActionsMenuProps {
    transaction: Transaction;
    onEdit?: () => void;
    onDeleted?: () => void;
    className?: string;
}

export function TransactionActionsMenu({
    transaction,
    onEdit,
    onDeleted,
    className,
}: TransactionActionsMenuProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const confirmDelete = async () => {
        setIsDeleting(true);
        
        try {
            const result = await deleteTransaction(transaction.id);
            if (result.success) {
                toast.success("Transação excluída com sucesso");
                onDeleted?.();
            } else {
                toast.error(result.error || "Erro ao excluir transação");
            }
        } catch (error) {
            console.error("Erro inesperado ao excluir transação:", error);
            toast.error("Erro inesperado");
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const handleEditClick = () => {
        onEdit?.();
    };

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 text-gray-400 hover:text-gray-600",
                            className
                        )}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleEditClick}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        onClick={handleDeleteClick}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title="Excluir transação"
                description={`Tem certeza que deseja excluir "${transaction.description}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                variant="destructive"
            />
        </>
    );
}

