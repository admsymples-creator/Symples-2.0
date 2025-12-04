"use client";

import { useState } from "react";
import { 
    MoreHorizontal, 
    Maximize2, 
    Copy, 
    Share2,
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
import { deleteTask, duplicateTask } from "@/lib/actions/tasks";
import { ConfirmModal } from "@/components/modals/confirm-modal";

interface Task {
    id: string;
    title: string;
    [key: string]: any;
}

interface TaskActionsMenuProps {
    task: Task;
    onOpenDetails?: () => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    className?: string;
}

export function TaskActionsMenu({
    task,
    onOpenDetails,
    onTaskUpdated,
    onTaskDeleted,
    className,
}: TaskActionsMenuProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Duplicar
    const handleDuplicate = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const result = await duplicateTask(task.id);

            if (result.success) {
                toast.success("Tarefa duplicada com sucesso");
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao duplicar tarefa");
            }
        } catch (error) {
            console.error("Erro ao duplicar tarefa:", error);
            toast.error("Erro inesperado ao duplicar tarefa");
        } finally {
            setIsProcessing(false);
        }
    };

    // Compartilhar (Copiar link)
    const handleShare = async () => {
        try {
            const url = `${window.location.origin}/tasks?taskId=${task.id}`;
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado para a área de transferência");
        } catch (error) {
            toast.error("Erro ao copiar link");
        }
    };

    // Excluir
    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteTask(task.id);
            if (result.success) {
                toast.success("Tarefa excluída com sucesso");
                onTaskDeleted?.();
            } else {
                toast.error(result.error || "Erro ao excluir tarefa");
            }
        } catch (error) {
            toast.error("Erro inesperado");
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-6 w-6 opacity-50 hover:opacity-100 transition-opacity cursor-pointer",
                            className
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                        }}
                        disabled={isDeleting || isProcessing}
                    >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {/* Abrir */}
                    {onOpenDetails && (
                        <DropdownMenuItem 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onOpenDetails(); 
                            }} 
                            className="text-xs"
                        >
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Abrir
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Duplicar */}
                    <DropdownMenuItem 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDuplicate(); 
                        }} 
                        className="text-xs" 
                        disabled={isProcessing}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                    </DropdownMenuItem>

                    {/* Compartilhar */}
                    <DropdownMenuItem 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleShare(); 
                        }} 
                        className="text-xs"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Excluir */}
                    <DropdownMenuItem 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDeleteClick(); 
                        }} 
                        className="text-xs text-red-600 focus:bg-red-50 focus:text-red-600" 
                        disabled={isDeleting}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? "Excluindo..." : "Excluir"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title="Excluir Tarefa?"
                description="Esta ação não pode ser desfeita."
                confirmText="Excluir Tarefa"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
            />
        </>
    );
}
